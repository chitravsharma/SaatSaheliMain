# SaatSaheli — Setup & Configuration Tasks

These are tasks that require manual setup in external services outside the SaatSaheli codebase.

---

## 1. Email Service — Password Reset & Contact Notifications

**Status:** DONE (code integrated, app password configured)
**Priority:** CRITICAL (users cannot reset their password without this)
**File:** `SaatSaheli/src/main/java/com/SaatSaheli/spring/controller/AuthController.java` (line 320)

### What's Wrong
The forgot-password endpoint generates a temporary password and stores its hash, but never sends it to the user via email. The frontend now shows "check your email" — but no email is actually sent yet.

### Step A: Enable 2-Factor Authentication on Google Account

You must enable 2FA on `avikaventures.info@gmail.com` before you can create an App Password for SMTP.

1. **Sign in** to the Google account at https://myaccount.google.com
2. Click **Security** in the left sidebar
3. Under **"How you sign in to Google"**, click **2-Step Verification**
4. Click **Get started**
5. Google will ask you to confirm your password — enter it
6. **Choose your second factor** (pick one):
   - **Phone prompt (recommended):** If the account is signed in on a phone, Google will offer "Google prompts" — tap Yes/No on your phone to verify. Click **Try it now**, then approve the prompt on your phone.
   - **Text message / Phone call:** Enter a phone number, choose "Text message" or "Phone call", and enter the verification code Google sends.
   - **Authenticator app:** Click "Authenticator app", scan the QR code with an app like Google Authenticator, Microsoft Authenticator, or Authy, and enter the 6-digit code.
7. Click **Turn on** to activate 2-Step Verification
8. **Save backup codes** — Google will offer recovery codes. Save them somewhere safe (e.g., a password manager). These let you sign in if you lose your phone.

### Step B: Generate an App Password

After 2FA is enabled:

1. Go to https://myaccount.google.com/apppasswords
   - If you don't see this page, search "App Passwords" in Google Account settings
2. Under **"App name"**, type: `SaatSaheli`
3. Click **Create**
4. Google will display a **16-character password** (like `abcd efgh ijkl mnop`)
5. **Copy this password** — you will only see it once
6. Remove the spaces — the password is the 16 characters together: `abcdefghijklmnop`

### Step C: Add to Environment Variables

Add to `SaatSaheli/.env`:
```
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=avikaventures.info@gmail.com
MAIL_PASSWORD=abcdefghijklmnop
MAIL_FROM=avikaventures.info@gmail.com
```
(Replace `abcdefghijklmnop` with the actual App Password from Step B)

### Step D: Add Spring Mail Dependency

Add to `SaatSaheli/pom.xml` inside `<dependencies>`:
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-mail</artifactId>
</dependency>
```

### Step E: Add Mail Config to application.properties

Add to `SaatSaheli/src/main/resources/application.properties`:
```properties
spring.mail.host=${MAIL_HOST:smtp.gmail.com}
spring.mail.port=${MAIL_PORT:587}
spring.mail.username=${MAIL_USERNAME:}
spring.mail.password=${MAIL_PASSWORD:}
spring.mail.properties.mail.smtp.auth=true
spring.mail.properties.mail.smtp.starttls.enable=true
```

### Step F: Create EmailService.java and Wire It Up

Once the above config is in place, create an `EmailService.java` that autowires `JavaMailSender` and sends:
- Password reset emails (called from `AuthController.forgotPassword()`)
- Optionally, contact form notification emails to `avikaventures.info@gmail.com`

### Step G: Restart Backend

```bash
cd SaatSaheli && ./mvnw clean spring-boot:run
```

---

## 2. Stripe Payment Integration (Deferred — Future Reference)

**Status:** DEFERRED
**Priority:** LOW — paid plan upgrades are currently handled via manual admin upgrade + "Contact us" flow
**File:** `SaatSaheli/src/main/java/com/SaatSaheli/spring/controller/PaymentController.java` (lines 45-49)

> **Current Flow:** The Pricing page shows "Contact Us to Upgrade" for paid plans. Users email `avikaventures.info@gmail.com` and an admin upgrades them via the Admin Dashboard. When demand grows, follow the steps below to enable self-service payments.

### What Needs to Change
The `PLAN_PRICE_IDS` map in `PaymentController.java` uses placeholder values (`price_premium_placeholder`, etc.). The `Checkout.jsx` and `Pricing.jsx` were updated to show a "Contact Us" flow instead. All Stripe backend code is still in place and functional — it just needs real price IDs.

### Step A: Create Stripe Account & Products

1. **Sign up / Log in** at https://dashboard.stripe.com
2. Complete business verification if not already done
3. Go to **Products** > **Add Product** and create three products:

   | Product Name | Price | Billing |
   |-------------|-------|---------|
   | Premium | $9.00 | Monthly recurring |
   | Gold Member | $19.00 | Monthly recurring |
   | Creator / Pro | $39.00 | Monthly recurring |

4. After creating each product, click into it and copy the **Price ID** (starts with `price_`)

### Step B: Get API Keys

1. Go to **Developers** > **API Keys** in Stripe Dashboard
2. Copy the **Secret key** (starts with `sk_test_` for test mode or `sk_live_` for production)
3. For webhooks: go to **Developers** > **Webhooks** > **Add endpoint**
   - Endpoint URL: `https://your-backend-domain.com/api/payments/webhook`
   - Events to listen for: `checkout.session.completed`
   - Copy the **Signing secret** (starts with `whsec_`)

### Step C: Add to Environment Variables

Add to `SaatSaheli/.env`:
```
STRIPE_SECRET_KEY=sk_test_...your_key
STRIPE_WEBHOOK_SECRET=whsec_...your_secret
STRIPE_PRICE_PREMIUM=price_1ABC...your_premium_price_id
STRIPE_PRICE_GOLD=price_1DEF...your_gold_price_id
STRIPE_PRICE_CREATOR=price_1GHI...your_creator_price_id
```

### Step D: Update PaymentController.java

Replace the hardcoded `PLAN_PRICE_IDS` map with environment variable injection:
```java
@Value("${STRIPE_PRICE_PREMIUM:}")
private String stripePricePremium;

@Value("${STRIPE_PRICE_GOLD:}")
private String stripePriceGold;

@Value("${STRIPE_PRICE_CREATOR:}")
private String stripePriceCreator;

private Map<String, String> planPriceIds;

@PostConstruct
public void init() {
    // ... existing Stripe.apiKey setup ...
    planPriceIds = new HashMap<>();
    planPriceIds.put("Premium", stripePricePremium);
    planPriceIds.put("Gold", stripePriceGold);
    planPriceIds.put("Creator", stripePriceCreator);
}
```

### Step E: Update Frontend to Restore Stripe Checkout

1. **`Pricing.jsx`** — Change `handleSelect` back to `navigate(/checkout?plan=${plan.key})` and update button labels from "Contact Us to Upgrade" back to the original plan CTAs
2. **`Checkout.jsx`** — Restore the Stripe checkout session flow (the original version is in git history)
3. **`Login.jsx`** — Remove the "Paid plans require manual activation" note from the signup form

### Step F: Test in Stripe Test Mode

1. Use `sk_test_` keys (not `sk_live_`) during development
2. Use Stripe test card: `4242 4242 4242 4242`, any future expiry, any CVC
3. Verify the webhook fires and the user's plan gets updated in the database
4. Switch to live keys only when ready for real payments

### Step G: Restart Backend

```bash
cd SaatSaheli && ./mvnw clean spring-boot:run
```

---

## Summary

| # | Task | Priority | Status |
|---|------|----------|--------|
| 1 | Gmail 2FA + App Password + Spring Mail | CRITICAL | DONE (code wired, app password set) |
| 2 | Stripe Payment Integration | LOW | Deferred (full steps above for future) |

---

*Updated April 3, 2026*
