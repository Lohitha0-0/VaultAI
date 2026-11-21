"""
AI Banking Security System — FastAPI Backend v3.1
PaySim + IEEE-CIS ensemble fraud detection
Behavioral passwordless authentication
SMS log stored in memory — viewable on frontend via /api/sms-log
"""

import os, uuid, hashlib, math, json, random
from datetime import datetime
from typing import Optional, List
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np
import pandas as pd

# ── ML Models ─────────────────────────────────────────────────────────────────
try:
    import joblib
    RF_PAYSIM   = joblib.load("random_forest.pkl")
    GB_PAYSIM   = joblib.load("gradient_boost.pkl")
    ISO_PAYSIM  = joblib.load("isolation_forest.pkl")
    IMP_PAYSIM  = joblib.load("imputer.pkl")
    SC_PAYSIM   = joblib.load("scaler.pkl")
    LE_PAYSIM   = joblib.load("type_encoder.pkl")
    FEAT_PAYSIM = joblib.load("feature_names.pkl")
    with open("model_meta.json") as f: META_PAYSIM = json.load(f)
    RF_IEEE   = joblib.load("ieee_random_forest.pkl")
    GB_IEEE   = joblib.load("ieee_gradient_boost.pkl")
    ISO_IEEE  = joblib.load("ieee_isolation_forest.pkl")
    IMP_IEEE  = joblib.load("ieee_imputer.pkl")
    SC_IEEE   = joblib.load("ieee_scaler.pkl")
    FEAT_IEEE = joblib.load("ieee_feature_names.pkl")
    with open("ieee_model_meta.json") as f: META_IEEE = json.load(f)
    MODELS_READY = True
    print("Both ML models loaded successfully")
except Exception as e:
    MODELS_READY = False
    print("Models not loaded: " + str(e))

# ── In-memory store ───────────────────────────────────────────────────────────
USERS        = {}
SESSIONS     = {}
TRANSACTIONS = {}
ALERTS       = []
SMS_LOG      = []
PENDING_TXN  = {}
PHONE_CODES  = {}

# ══════════════════════════════════════════════════════════════════════════════
# App
# ══════════════════════════════════════════════════════════════════════════════
app = FastAPI(title="VaultAI Banking API", version="3.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# ══════════════════════════════════════════════════════════════════════════════
# Schemas
# ══════════════════════════════════════════════════════════════════════════════
class TypingProfile(BaseModel):
    key_hold_times: List[float] = []
    flight_times:   List[float] = []
    typing_rhythm:  List[float] = []
    total_time_ms:  float = 0

class DeviceFingerprint(BaseModel):
    browser:           str = ""
    os:                str = ""
    screen_resolution: str = ""
    timezone:          str = ""
    language:          str = ""
    cpu_cores:         int = 0
    fingerprint_hash:  str = ""

class RegisterRequest(BaseModel):
    username:       str
    email:          str
    full_name:      str
    mobile_number:  str
    typing_profile: TypingProfile
    device:         DeviceFingerprint
    ip_address:     str  = "unknown"
    location:       dict = {}

class LoginRequest(BaseModel):
    username:       str
    typing_profile: TypingProfile
    device:         DeviceFingerprint
    ip_address:     str  = "unknown"
    location:       dict = {}

class TransactionRequest(BaseModel):
    amount:           float
    transaction_type: str
    recipient_id:     Optional[str] = None
    description:      str = ""

class AlertAckRequest(BaseModel):
    alert_id: str

class BehaviorVerifyRequest(BaseModel):
    txn_id:         str
    typing_profile: TypingProfile

class PhoneVerifyRequest(BaseModel):
    mobile_number: str
    code:          str

# ══════════════════════════════════════════════════════════════════════════════
# SMS Logger
# ══════════════════════════════════════════════════════════════════════════════
def log_sms(to, body, sms_type, user_id=""):
    entry = {
        "sms_id":    str(uuid.uuid4()),
        "user_id":   user_id,
        "to":        to,
        "body":      body,
        "type":      sms_type,
        "timestamp": datetime.utcnow().isoformat(),
        "read":      False,
    }
    SMS_LOG.append(entry)
    print("\n[SMS to " + to + "]\n" + body + "\n" + "-"*40)
    return entry

def _dev(d):
    b = d.get("browser", "Unknown")[:35]
    return b + " | " + d.get("os", "Unknown") + " | " + d.get("screen_resolution", "")

def _loc(l):
    city    = l.get("city", "Unknown")
    country = l.get("country", "Unknown")
    ip      = l.get("ip", "")
    out     = city + ", " + country
    if ip:
        out += " | IP: " + ip
    return out

def _ts():
    return datetime.utcnow().strftime("%d %b %Y, %H:%M UTC")

# ── SMS templates ─────────────────────────────────────────────────────────────
def sms_welcome(user):
    body = (
        "Welcome to VaultAI!\n"
        "Hi " + user["full_name"] + ", your account is now active.\n"
        "Balance : $10,000.00\n"
        "AI Fraud Protection: ON\n"
        "You will receive an alert for every transaction."
    )
    log_sms(user["mobile_number"], body, "WELCOME", user["user_id"])

def sms_approved(user, amount, txn_type, fraud, device, location, bal_after):
    risk  = fraud.get("risk_level", "LOW")
    score = int(fraud.get("final_score", 0) * 100)
    sign  = "+" if txn_type == "DEPOSIT" else "-"
    body = (
        "VaultAI Transaction Alert\n"
        "──────────────────────────\n"
        "Type    : " + txn_type + "\n"
        "Amount  : " + sign + "$" + "{:,.2f}".format(amount) + "\n"
        "Balance : $" + "{:,.2f}".format(bal_after) + "\n"
        "Risk    : " + risk + " (" + str(score) + "% fraud score)\n"
        "Time    : " + _ts() + "\n"
        "Device  : " + _dev(device) + "\n"
        "Location: " + _loc(location) + "\n"
        "──────────────────────────\n"
        "Not you? Call us immediately."
    )
    log_sms(user["mobile_number"], body, "TRANSACTION", user["user_id"])

def sms_blocked(user, amount, txn_type, fraud, device, location):
    score = int(fraud.get("final_score", 0) * 100)
    body = (
        "VaultAI TRANSACTION BLOCKED\n"
        "──────────────────────────\n"
        "A HIGH-RISK transaction was blocked.\n"
        "Type    : " + txn_type + "\n"
        "Amount  : $" + "{:,.2f}".format(amount) + "\n"
        "AI Score: " + str(score) + "% fraud probability\n"
        "Time    : " + _ts() + "\n"
        "Device  : " + _dev(device) + "\n"
        "Location: " + _loc(location) + "\n"
        "──────────────────────────\n"
        "If this was NOT you your account is SAFE.\n"
        "Change your credentials immediately."
    )
    log_sms(user["mobile_number"], body, "BLOCKED", user["user_id"])

def sms_suspicious_login(user, device, location, auth_risk, sim):
    body = (
        "VaultAI Suspicious Login BLOCKED\n"
        "──────────────────────────\n"
        "Someone tried to log in and was denied.\n"
        "Time      : " + _ts() + "\n"
        "Device    : " + _dev(device) + "\n"
        "Location  : " + _loc(location) + "\n"
        "Auth Risk : " + str(int(auth_risk * 100)) + "%\n"
        "Typing Sim: " + str(int(sim * 100)) + "%\n"
        "Status    : ACCESS DENIED\n"
        "──────────────────────────\n"
        "Your account is safe."
    )
    log_sms(user["mobile_number"], body, "SUSPICIOUS_LOGIN", user["user_id"])

def sms_behavior_failed(user, device, location):
    body = (
        "VaultAI Identity Verification Required\n"
        "──────────────────────────\n"
        "Behavioral check FAILED on a flagged transaction.\n"
        "You have been signed out automatically.\n"
        "Time    : " + _ts() + "\n"
        "Device  : " + _dev(device) + "\n"
        "Location: " + _loc(location) + "\n"
        "──────────────────────────\n"
        "Use your mobile number to re-verify and log back in."
    )
    log_sms(user["mobile_number"], body, "SUSPICIOUS_LOGIN", user["user_id"])

def sms_phone_code(user, code):
    body = (
        "VaultAI Phone Verification Code\n"
        "──────────────────────────\n"
        "Your verification code is: " + code + "\n"
        "Valid for 10 minutes.\n"
        "Do not share this code with anyone."
    )
    log_sms(user["mobile_number"], body, "WELCOME", user["user_id"])

def sms_new_login(user, device, location):
    body = (
        "VaultAI New Login Detected\n"
        "──────────────────────────\n"
        "Hi " + user["full_name"] + ", login from new device/location.\n"
        "Time    : " + _ts() + "\n"
        "Device  : " + _dev(device) + "\n"
        "Location: " + _loc(location) + "\n"
        "──────────────────────────\n"
        "Not you? Secure your account now."
    )
    log_sms(user["mobile_number"], body, "NEW_LOGIN", user["user_id"])

# ══════════════════════════════════════════════════════════════════════════════
# ML Scoring
# ══════════════════════════════════════════════════════════════════════════════
def score_paysim(amount, txn_type, old_bal_orig, new_bal_orig,
                 old_bal_dest, new_bal_dest, step):
    try:
        type_map = {"TRANSFER":4,"PAYMENT":3,"WITHDRAWAL":1,"DEPOSIT":0,
                    "DEBIT":2,"CASH_OUT":5,"CASH_IN":6}
        te  = type_map.get(txn_type, 3)
        eo  = new_bal_orig + amount - old_bal_orig
        ed  = old_bal_dest + amount - new_bal_dest
        bro = amount / (old_bal_orig + 1)
        brd = amount / (old_bal_dest + 1)
        row = {
            "type_enc":te, "amount":amount,
            "oldbalanceOrg":old_bal_orig, "newbalanceOrig":new_bal_orig,
            "oldbalanceDest":old_bal_dest, "newbalanceDest":new_bal_dest,
            "errorBalanceOrig":eo, "errorBalanceDest":ed,
            "balanceRatioOrig":bro, "balanceRatioDest":brd,
            "isMerchant":1 if txn_type=="PAYMENT" else 0,
            "isHighAmount":1 if amount>5000 else 0,
            "zeroBalOrig":1 if new_bal_orig==0 else 0,
            "zeroBalDest":1 if old_bal_dest==0 else 0,
            "stepHour":step%24, "stepDay":step//24, "step":step,
        }
        X  = pd.DataFrame([{f: row.get(f,0) for f in FEAT_PAYSIM}])
        X  = pd.DataFrame(IMP_PAYSIM.transform(X), columns=FEAT_PAYSIM)
        X  = pd.DataFrame(SC_PAYSIM.transform(X),  columns=FEAT_PAYSIM)
        Xv = X.values
        mn, mx = META_PAYSIM["iso_score_range"]
        rf  = float(RF_PAYSIM.predict_proba(Xv)[0,1])
        gb  = float(GB_PAYSIM.predict_proba(Xv)[0,1])
        ir  = float(ISO_PAYSIM.decision_function(Xv)[0])
        iso = float(np.clip(1-(ir-mn)/(mx-mn+1e-9),0,1))
        return float(np.clip(0.4*rf+0.4*gb+0.2*iso,0,1)), rf, gb, iso
    except Exception as e:
        print("PaySim error: " + str(e)); return 0.0,0.0,0.0,0.0

def score_ieee(amount, txn_type, old_bal):
    try:
        row = {f:0 for f in FEAT_IEEE}
        row.update({
            "TransactionAmt":amount, "log_TransactionAmt":np.log1p(amount),
            "TransactionAmt_isRound":1 if amount%1==0 else 0,
            "nulls_count":10, "card1":hash(txn_type)%10000, "addr1":old_bal%500,
        })
        X  = pd.DataFrame([{f: row.get(f,0) for f in FEAT_IEEE}])
        X  = pd.DataFrame(IMP_IEEE.transform(X), columns=FEAT_IEEE)
        X  = pd.DataFrame(SC_IEEE.transform(X),  columns=FEAT_IEEE)
        Xv = X.values
        mn, mx = META_IEEE["iso_score_range"]
        rf  = float(RF_IEEE.predict_proba(Xv)[0,1])
        gb  = float(GB_IEEE.predict_proba(Xv)[0,1])
        ir  = float(ISO_IEEE.decision_function(Xv)[0])
        iso = float(np.clip(1-(ir-mn)/(mx-mn+1e-9),0,1))
        return float(np.clip(0.4*rf+0.4*gb+0.2*iso,0,1)), rf, gb, iso
    except Exception as e:
        print("IEEE error: " + str(e)); return 0.0,0.0,0.0,0.0

def combined_fraud_score(amount, txn_type, old_bal_orig, new_bal_orig,
                          old_bal_dest, new_bal_dest, step):
    bal_ratio = amount / (old_bal_orig + 1)
    boost     = 0.0
    reasons   = []
    
    if bal_ratio >= 0.90:
        boost += 0.85; reasons.append("Withdrawing " + str(int(bal_ratio*100)) + "% of balance - extreme drain")
    elif bal_ratio >= 0.75:
        boost += 0.70; reasons.append("Withdrawing " + str(int(bal_ratio*100)) + "% of balance - large drain")
    elif bal_ratio >= 0.50:
        boost += 0.40; reasons.append("Withdrawing " + str(int(bal_ratio*100)) + "% of balance - unusual amount")
    elif bal_ratio >= 0.30:
        boost += 0.15; reasons.append("Withdrawing " + str(int(bal_ratio*100)) + "% of balance")
    if amount >= 9000:
        boost += 0.25; reasons.append("Very high amount: $" + "{:,.2f}".format(amount))
    elif amount >= 7000:
        boost += 0.15; reasons.append("High amount: $" + "{:,.2f}".format(amount))
    elif amount >= 5000:
        boost += 0.08; reasons.append("Above-average amount: $" + "{:,.2f}".format(amount))
    if new_bal_orig <= 0:
        boost += 0.30; reasons.append("Transaction would empty the account")
    if txn_type in ["WITHDRAWAL","TRANSFER","CASH_OUT"]:
        boost += 0.05; reasons.append(txn_type + " carries higher fraud risk")
    boost = min(boost, 1.0)
    if not MODELS_READY:
        final = ps = ie = boost
        ps_rf=ps_gb=ps_iso=ie_rf=ie_gb=ie_iso=0.0
        label = "rule-based fallback"
    else:
        ps, ps_rf, ps_gb, ps_iso = score_paysim(amount, txn_type, old_bal_orig,
                                                  new_bal_orig, old_bal_dest, new_bal_dest, step)
        ie, ie_rf, ie_gb, ie_iso = score_ieee(amount, txn_type, old_bal_orig)
        ml    = 0.60*ps + 0.40*ie
        # If boost is very high (rule-based red flag), let it dominate
        if boost >= 0.70:
            final = float(np.clip(0.25*ml + 0.75*boost, 0, 1))
        else:
            final = float(np.clip(0.50*ml + 0.50*boost, 0, 1))
        label = "PaySim (60%) + IEEE-CIS (40%) + Rule Engine"
    if MODELS_READY:
        pt = META_PAYSIM.get("fraud_threshold",0.5)
        it = META_IEEE.get("fraud_threshold",0.4)
        thresh = 0.50*(0.60*pt+0.40*it) + 0.50*0.35
    else:
        thresh = 0.35
    risk  = get_risk_level(final)
    fraud = final >= thresh
    if MODELS_READY:
        if ps > 0.5: reasons.append("PaySim model detected mobile banking fraud pattern")
        if ie > 0.5: reasons.append("IEEE-CIS model flagged suspicious card features")
        if final > 0.75: reasons.append("Both models agree: high-confidence fraud signal")
    if not reasons: reasons.append("No significant fraud indicators detected")
    out = {
        "final_score":    round(final,4),
        "paysim_score":   round(ps if MODELS_READY else boost,4),
        "ieee_score":     round(ie if MODELS_READY else boost,4),
        "risk_level":     risk,
        "is_fraud":       fraud,
        "threshold_used": round(thresh,4),
        "models_used":    label,
        "explanation":    reasons,
    }
    if MODELS_READY:
        out["model_breakdown"] = {
            "paysim": {"rf":round(ps_rf,4),"gb":round(ps_gb,4),"iso":round(ps_iso,4)},
            "ieee":   {"rf":round(ie_rf,4),"gb":round(ie_gb,4),"iso":round(ie_iso,4)},
        }
    return out

def get_risk_level(s):
    if s < 0.30: return "LOW"
    if s < 0.50: return "MEDIUM"
    if s < 0.75: return "HIGH"
    return "CRITICAL"

# ══════════════════════════════════════════════════════════════════════════════
# Auth helpers
# ══════════════════════════════════════════════════════════════════════════════
def make_token(uid): return hashlib.sha256((uid+str(uuid.uuid4())).encode()).hexdigest()

def get_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing token")
    tok  = authorization.split(" ",1)[1]
    sess = SESSIONS.get(tok)
    if not sess: raise HTTPException(401, "Invalid session")
    uid  = sess["uid"] if isinstance(sess, dict) else sess
    if uid not in USERS: raise HTTPException(401, "Invalid session")
    user = USERS[uid]
    user["_session"] = sess
    return user

def safe_mean(l): return sum(l)/len(l) if l else 0.0
def safe_std(l):
    if len(l)<2: return 0.0
    m=safe_mean(l); return math.sqrt(sum((x-m)**2 for x in l)/len(l))

def build_profile(tp):
    return {"avg_hold":safe_mean(tp.key_hold_times),"std_hold":safe_std(tp.key_hold_times),
            "avg_flight":safe_mean(tp.flight_times),"std_flight":safe_std(tp.flight_times),
            "avg_rhythm":safe_mean(tp.typing_rhythm),"total_ms":tp.total_time_ms}

def typing_sim(stored, incoming):
    n = build_profile(incoming); diffs=[]
    # If stored profile has no real data yet, grant a generous base score
    if stored.get("avg_hold",0)==0 and stored.get("avg_flight",0)==0:
        return 0.75
    for k in ["avg_hold","std_hold","avg_flight","std_flight","avg_rhythm"]:
        s,v=stored.get(k,0),n.get(k,0)
        if s==0 and v==0: diffs.append(1.0)
        elif s==0:         diffs.append(0.5)   # unknown feature — neutral instead of 0
        else:
            ratio = abs(s-v)/(abs(s)+1e-9)
            diffs.append(max(0.0, 1.0 - min(ratio, 1.0)))
    return round(sum(diffs)/len(diffs),4)

def loc_risk(history, current):
    # No location history yet — give benefit of doubt
    if not history: return 0.0
    current_country = current.get("country","").strip()
    current_city    = current.get("city","").strip()
    # If location data is missing/unknown, don't penalize
    if not current_country or current_country in ("Unknown","unknown"):
        return 0.0
    for loc in history[-20:]:
        loc_country = loc.get("country","").strip()
        loc_city    = loc.get("city","").strip()
        if loc_country == current_country:
            # Same country — always low risk (supports travel within India)
            if loc_city == current_city:
                return 0.0   # Same city — zero risk
            else:
                return 0.05  # Different city, same country — very low risk
    # Entirely new country never seen before
    return 0.30  # Moderate — unusual but not blocked outright

def add_alert(uid, atype, msg, risk="MEDIUM", **kw):
    ALERTS.append({"alert_id":str(uuid.uuid4()),"user_id":uid,"type":atype,
                   "message":msg,"risk_level":risk,
                   "timestamp":datetime.utcnow().isoformat(),"read":False,**kw})

def safe_user(u): return {k:v for k,v in u.items() if k not in ("known_devices","_session")}

# ══════════════════════════════════════════════════════════════════════════════
# Routes
# ══════════════════════════════════════════════════════════════════════════════
@app.get("/api/health")
def health():
    return {"status":"ok","models_ready":MODELS_READY,"timestamp":datetime.utcnow().isoformat()}

@app.post("/api/register")
def register(req: RegisterRequest):
    print(f"[REGISTER] username={req.username} mobile={req.mobile_number} email={req.email}")
    if any(u["username"]==req.username for u in USERS.values()):
        raise HTTPException(409, "Username already taken — please choose a different username")
    mobile = req.mobile_number.strip()
    if not mobile.startswith("+") or len(mobile)<8:
        raise HTTPException(400, "Mobile must start with + and country code e.g. +919876543210")
    try:
        uid = str(uuid.uuid4())
        USERS[uid] = {
            "user_id":uid,"username":req.username,"email":req.email,
            "full_name":req.full_name,"mobile_number":mobile,
            "balance":10000.0,"typing_profile":build_profile(req.typing_profile),
            "known_devices":[req.device.dict()],"login_history":[],
            "known_locations":[req.location],"created_at":datetime.utcnow().isoformat(),
            "txn_count":0,
        }
        token = make_token(uid)
        SESSIONS[token] = {"uid":uid,"device":req.device.dict(),"location":req.location,"ip":req.ip_address}
        sms_welcome(USERS[uid])
        print(f"[REGISTER] SUCCESS uid={uid}")
        return {"success":True,"token":token,"user":safe_user(USERS[uid])}
    except Exception as ex:
        # Clean up partial user if created
        if 'uid' in locals() and uid in USERS: del USERS[uid]
        print(f"[REGISTER] ERROR: {ex}")
        raise HTTPException(500, f"Registration error: {str(ex)}")

@app.post("/api/login")
def login(req: LoginRequest):
    user = next((u for u in USERS.values() if u["username"]==req.username),None)
    if not user: raise HTTPException(404,"User not found")
    sim      = typing_sim(user["typing_profile"], req.typing_profile)
    dev_ok   = any(d.get("fingerprint_hash")==req.device.fingerprint_hash for d in user["known_devices"])
    lr       = loc_risk(user["known_locations"], req.location)
    # Weight: typing pattern 60% | device 20% | location 20%
    # Unknown device alone should never block — it just adds mild risk
    device_risk = 0.0 if dev_ok else 0.15
    auth_risk   = (1-sim)*0.60 + device_risk*0.20 + lr*0.20
    # Pass if typing matches reasonably — location/device are secondary signals
    passed   = sim>=0.15 and auth_risk<=0.85
    user["login_history"].append({
        "timestamp":datetime.utcnow().isoformat(),"ip":req.ip_address,
        "location":req.location,"device":req.device.dict(),
        "typing_sim":sim,"auth_risk":round(auth_risk,4),
        "status":"ok" if passed else "suspicious"
    })
    if passed:
        # Always record new location so next login from same city is zero risk
        if req.location:
            user["known_locations"].append(req.location)
        # Register new device so it's recognized next time
        if not dev_ok:
            user["known_devices"].append(req.device.dict())
        # Update typing profile with new data (rolling average)
        p = build_profile(req.typing_profile)
        for k in ["avg_hold","std_hold","avg_flight","std_flight","avg_rhythm"]:
            user["typing_profile"][k]=0.85*user["typing_profile"].get(k,0)+0.15*p.get(k,0)
        # Send SMS only for genuinely new device OR new country
        if not dev_ok or lr>=0.30:
            sms_new_login(user, req.device.dict(), req.location)
    else:
        add_alert(user["user_id"],"SUSPICIOUS_LOGIN",
                  "Unusual login blocked. Risk: " + str(round(auth_risk,2)),"HIGH")
        sms_suspicious_login(user, req.device.dict(), req.location, auth_risk, sim)
        raise HTTPException(401,{"message":"Authentication failed",
                                  "typing_sim":sim,"auth_risk":round(auth_risk,4)})
    token = make_token(user["user_id"])
    SESSIONS[token] = {"uid":user["user_id"],"device":req.device.dict(),"location":req.location,"ip":req.ip_address}
    return {"success":True,"token":token,
            "auth_details":{"typing_similarity":sim,"device_known":dev_ok,
                             "location_risk":round(lr,4),"auth_risk":round(auth_risk,4)},
            "user":safe_user(user)}

@app.post("/api/transactions")
def create_transaction(req: TransactionRequest, user=Depends(get_user)):
    if req.amount<=0: raise HTTPException(400,"Amount must be positive")
    if req.transaction_type!="DEPOSIT" and req.amount>user["balance"]:
        raise HTTPException(400,"Insufficient funds")
    old_bal   = user["balance"]
    new_bal   = old_bal+req.amount if req.transaction_type=="DEPOSIT" else old_bal-req.amount
    step      = user["txn_count"]+1
    sess      = user.get("_session", {})
    l_dev     = sess.get("device") or (user["login_history"][-1].get("device",{}) if user["login_history"] else {})
    l_loc     = sess.get("location") or (user["login_history"][-1].get("location",{}) if user["login_history"] else {})
    l_ip      = sess.get("ip","unknown")
    if l_loc and "ip" not in l_loc:
        l_loc = dict(l_loc); l_loc["ip"] = l_ip
    fraud      = combined_fraud_score(req.amount, req.transaction_type, old_bal, new_bal, 0, req.amount, step)
    bal_ratio  = req.amount / (old_bal + 1)
    is_blocked = (
        fraud["risk_level"] == "CRITICAL"
    ) or (
        fraud["risk_level"] == "HIGH" and bal_ratio >= 0.75
    )
    # REPLACE WITH:
    if is_blocked:
        # ── Auto sign out: invalidate all sessions for this user ──
        sessions_to_delete = [
            tok for tok, sess in SESSIONS.items()
            if (sess["uid"] if isinstance(sess, dict) else sess) == user["user_id"]
        ]
        for tok in sessions_to_delete:
            del SESSIONS[tok]

        add_alert(user["user_id"], "BLOCKED_TRANSACTION",
                  "${:,.2f} {} BLOCKED. Score: {:.2f}. Session terminated.".format(
                      req.amount, req.transaction_type, fraud["final_score"]),
                  "CRITICAL", amount=req.amount)
        sms_blocked(user, req.amount, req.transaction_type, fraud, l_dev, l_loc)
        raise HTTPException(403, {
            "message":        "Transaction blocked - high fraud risk. You have been signed out.",
            "fraud_score":    fraud["final_score"],
            "risk_level":     fraud["risk_level"],
            "auto_signed_out": True   # ← frontend reads this flag
        })
    txn_id    = str(uuid.uuid4())
    bal_after = old_bal+req.amount if req.transaction_type=="DEPOSIT" else old_bal-req.amount
    txn = {
        "txn_id":txn_id,"user_id":user["user_id"],
        "amount":req.amount,"transaction_type":req.transaction_type,
        "description":req.description,"balance_after":bal_after,
        "timestamp":datetime.utcnow().isoformat(),"fraud_analysis":fraud,
        "status":"PENDING_VERIFY" if fraud["is_fraud"] else "COMPLETED",
        "device":l_dev,"location":l_loc,
    }
    if fraud["is_fraud"]:
        PENDING_TXN[txn_id] = txn
        add_alert(user["user_id"],"SUSPICIOUS_TRANSACTION",
                  "Suspicious ${:,.2f} {}. Score: {:.2f}. Verification required.".format(
                      req.amount, req.transaction_type, fraud["final_score"]),
                  fraud["risk_level"], amount=req.amount)
        return {"success":True,"transaction":txn,"requires_verification":True}
    user["balance"]   = bal_after
    user["txn_count"] += 1
    TRANSACTIONS[txn_id] = txn
    sms_approved(user, req.amount, req.transaction_type, fraud, l_dev, l_loc, user["balance"])
    return {"success":True,"transaction":txn,"requires_verification":False}

@app.get("/api/transactions")
def get_transactions(user=Depends(get_user)):
    txns = sorted([t for t in TRANSACTIONS.values() if t["user_id"]==user["user_id"]],
                  key=lambda x:x["timestamp"],reverse=True)
    return {"transactions":txns,"total":len(txns)}

@app.get("/api/dashboard")
def dashboard(user=Depends(get_user)):
    txns   = [t for t in TRANSACTIONS.values() if t["user_id"]==user["user_id"]]
    alerts = [a for a in ALERTS if a["user_id"]==user["user_id"]]
    sms    = [s for s in SMS_LOG  if s["user_id"]==user["user_id"]]
    score  = 100-sum(1 for l in user["login_history"][-5:] if l["status"]=="suspicious")*15
    return {
        "user": safe_user(user),
        "stats": {
            "balance":            round(user["balance"],2),
            "total_transactions": len(txns),
            "flagged_count":      sum(1 for t in txns if t.get("status")=="FLAGGED"),
            "total_spent":        round(sum(t["amount"] for t in txns if t["transaction_type"]!="DEPOSIT"),2),
            "unread_alerts":      sum(1 for a in alerts if not a["read"]),
            "unread_sms":         sum(1 for s in sms if not s["read"]),
            "security_score":     max(0,min(100,score)),
        },
        "recent_transactions": sorted(txns,  key=lambda x:x["timestamp"],reverse=True)[:5],
        "recent_alerts":       sorted(alerts,key=lambda x:x["timestamp"],reverse=True)[:5],
        "models_status":{"paysim_ready":MODELS_READY,"ieee_ready":MODELS_READY},
    }

@app.get("/api/alerts")
def get_alerts(user=Depends(get_user)):
    return {"alerts":sorted([a for a in ALERTS if a["user_id"]==user["user_id"]],
                             key=lambda x:x["timestamp"],reverse=True)}

@app.post("/api/alerts/acknowledge")
def ack_alert(req: AlertAckRequest, user=Depends(get_user)):
    for a in ALERTS:
        if a["alert_id"]==req.alert_id and a["user_id"]==user["user_id"]:
            a["read"]=True; return {"success":True}
    raise HTTPException(404,"Alert not found")

@app.post("/api/verify-behavior")
def verify_behavior(req: BehaviorVerifyRequest, user=Depends(get_user)):
    sim    = typing_sim(user["typing_profile"], req.typing_profile)
    passed = sim >= 0.45
    if passed:
        txn = PENDING_TXN.pop(req.txn_id, None)
        if not txn:
            raise HTTPException(404, "Pending transaction not found or already resolved")
        uid = user["user_id"]
        if txn["transaction_type"] == "DEPOSIT":
            USERS[uid]["balance"] += txn["amount"]
        else:
            USERS[uid]["balance"] -= txn["amount"]
        USERS[uid]["txn_count"]  += 1
        txn["balance_after"]      = USERS[uid]["balance"]
        txn["status"]             = "COMPLETED"
        txn["behavior_verified"]  = True
        txn["behavior_sim"]       = round(sim, 4)
        TRANSACTIONS[txn["txn_id"]] = txn
        sess = user.get("_session", {})
        sms_approved(user, txn["amount"], txn["transaction_type"],
                     txn["fraud_analysis"], sess.get("device",{}),
                     sess.get("location",{}), txn["balance_after"])
        return {"success":True,"similarity":round(sim,4),
                "transaction":txn,"message":"Behavior verified - transaction approved"}
    else:
        bad = [t for t,s in SESSIONS.items()
               if (s["uid"] if isinstance(s,dict) else s)==user["user_id"]]
        for t in bad: del SESSIONS[t]
        PENDING_TXN.pop(req.txn_id, None)
        sess = user.get("_session", {})
        sms_behavior_failed(user, sess.get("device",{}), sess.get("location",{}))
        add_alert(user["user_id"],"SUSPICIOUS_LOGIN",
                  "Behavior re-verification FAILED (sim=" + str(round(sim,2)) + "). Session terminated.","CRITICAL")
        raise HTTPException(401,{"message":"Behavioral verification failed - signed out",
                                  "similarity":round(sim,4),"require_phone_verify":True})

@app.post("/api/send-phone-code")
def send_phone_code(body: dict):
    username = body.get("username","").strip()
    user = next((u for u in USERS.values() if u["username"]==username), None)
    if not user: raise HTTPException(404,"User not found")
    code = str(random.randint(100000, 999999))
    PHONE_CODES[user["user_id"]] = {"code":code,"expires":datetime.utcnow().isoformat()}
    sms_phone_code(user, code)
    return {"success":True,
            "message":"Code sent to " + user["mobile_number"][:6] + "****",
            "mobile_hint":user["mobile_number"][:4]+"****"+user["mobile_number"][-2:]}

@app.post("/api/verify-phone")
def verify_phone(req: PhoneVerifyRequest):
    user = next((u for u in USERS.values() if u["mobile_number"]==req.mobile_number), None)
    if not user: raise HTTPException(404,"Mobile number not found")
    entry = PHONE_CODES.get(user["user_id"])
    if not entry: raise HTTPException(400,"No code requested - call /api/send-phone-code first")
    if entry["code"] != req.code.strip():
        raise HTTPException(400,{"message":"Invalid code","hint":"Check your SMS inbox"})
    del PHONE_CODES[user["user_id"]]
    token = make_token(user["user_id"])
    SESSIONS[token] = {"uid":user["user_id"],"device":{},"location":{},"ip":"phone-verified"}
    return {"success":True,"token":token,"user":safe_user(user),
            "message":"Phone verified - session restored"}

@app.get("/api/sms-log")
def get_sms_log(user=Depends(get_user)):
    msgs = sorted([s for s in SMS_LOG if s["user_id"]==user["user_id"]],
                  key=lambda x:x["timestamp"], reverse=True)
    return {"messages":msgs,"total":len(msgs),
            "unread":sum(1 for s in msgs if not s["read"])}

@app.post("/api/sms-log/{sms_id}/read")
def mark_sms_read(sms_id: str, user=Depends(get_user)):
    for s in SMS_LOG:
        if s["sms_id"]==sms_id and s["user_id"]==user["user_id"]:
            s["read"]=True; return {"success":True}
    raise HTTPException(404,"SMS not found")

@app.post("/api/sms-log/read-all")
def mark_all_sms_read(user=Depends(get_user)):
    for s in SMS_LOG:
        if s["user_id"]==user["user_id"]: s["read"]=True
    return {"success":True}

@app.get("/api/profile")
def get_profile(user=Depends(get_user)):
    return {"user":safe_user(user),"login_history":user["login_history"][-10:]}

if __name__=="__main__":
    import uvicorn
    uvicorn.run("main:app",host="0.0.0.0",port=8000,reload=True)