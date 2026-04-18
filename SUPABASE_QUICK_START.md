# Quick Supabase Setup - CashFlow App

**TL;DR** - Setup Supabase dalam 10 menit

---

## ⚡ Quick Setup Steps

### 1️⃣ Create Supabase Project
- Buka [supabase.com](https://supabase.com)
- Click "New Project"
- Fill: Name, Database Password, Region
- Wait untuk deployment (±2 menit)

### 2️⃣ Get API Keys
- Settings → API
- Copy `Project URL` & `Anon Key`

### 3️⃣ Update .env.local
```env
NEXT_PUBLIC_SUPABASE_URL=your-url-here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4️⃣ Create Database Tables
Buka Supabase Dashboard → SQL Editor → Copy & Run:

```sql
-- Transactions Table
CREATE TABLE public.transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text VARCHAR(255) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  category VARCHAR(50) NOT NULL,
  wallet VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Users see own data"
  ON public.transactions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_user_date ON public.transactions(user_id, date DESC);
```

### 5️⃣ Configure Auth Emails
- Authentication → Email Templates
- Update "Reset Password" template (penting untuk forgot password)
- Authentication → Policies → Enable "Confirm email"
- Authentication → URL Configuration → Add Redirect URLs:
  - `http://localhost:3000`
  - `http://localhost:3000/auth/reset-password`

### 6️⃣ Test di Browser Console
```javascript
import { supabase } from '@/lib/supabase';

// Test connection
const { data: { user } } = await supabase.auth.getUser();
console.log(user);
```

---

## 🔐 Minimum Security Setup

```sql
-- Run di SQL Editor

-- Drop existing policies jika ada
DROP POLICY IF EXISTS "public.transactions_read" ON public.transactions;
DROP POLICY IF EXISTS "public.transactions_write" ON public.transactions;

-- RLS yang secure
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_read_own"
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_insert_own"
  ON public.transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_update_own"
  ON public.transactions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_delete_own"
  ON public.transactions FOR DELETE
  USING (auth.uid() = user_id);
```

---

## ✅ Test Checklist

- [ ] Can sign up
- [ ] Can login
- [ ] Can create transaction
- [ ] Can see own transactions (not others)
- [ ] Forgot password link works
- [ ] Email verification works

---

## 📱 Production Checklist

- [ ] Rotate API keys
- [ ] Enable 2FA on Supabase account
- [ ] Set proper Site URL & Redirect URLs
- [ ] Setup monitoring/alerts
- [ ] Enable automated backups
- [ ] Test RLS policies
- [ ] Setup custom email provider (Resend/SendGrid)
- [ ] Enable CORS for your domain
- [ ] Review and audit logs

---

## 🆘 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| Signup fails | Check email confirmation is enabled |
| Forgot password email not sent | Check email templates are configured |
| CORS error | Add your domain to Settings → CORS |
| Can see other users' data | Check RLS policies, restart app |
| Forgot password token expired | Token valid 24 hours, request new link |

---

**Full documentation**: See `SUPABASE_SETUP.md` for detailed guide
