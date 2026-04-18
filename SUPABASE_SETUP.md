# Supabase Configuration Guide - CashFlow App

Dokumentasi lengkap untuk setup Supabase agar CashFlow App berfungsi dengan optimal.

---

## 📋 Prerequisites

- Akun Supabase ([https://supabase.com](https://supabase.com))
- Project sudah dibuat di Supabase Dashboard
- API Keys sudah digenerate

---

## 🔑 Step 1: Get API Keys

1. Buka [Supabase Dashboard](https://app.supabase.com)
2. Pilih project Anda
3. Pergi ke **Settings** → **API**
4. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **Anon (Public) Key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 🗄️ Step 2: Database Schema Setup

Login ke Supabase Dashboard → SQL Editor → Run queries berikut:

### Create `transactions` Table

```sql
-- Create transactions table
CREATE TABLE public.transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text VARCHAR(255) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  category VARCHAR(50) NOT NULL,
  wallet VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index untuk faster queries
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_date ON public.transactions(date DESC);
CREATE INDEX idx_transactions_user_date ON public.transactions(user_id, date DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users hanya bisa akses transaksi mereka sendiri
CREATE POLICY "Users can only access their own transactions"
  ON public.transactions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Insert transactions
CREATE POLICY "Users can insert their own transactions"
  ON public.transactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Update transactions
CREATE POLICY "Users can update their own transactions"
  ON public.transactions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Delete transactions
CREATE POLICY "Users can delete their own transactions"
  ON public.transactions
  FOR DELETE
  USING (auth.uid() = user_id);
```

### Create `user_profiles` Table (Optional tapi recommended)

```sql
-- Create user_profiles table untuk menyimpan data tambahan user
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(255),
  phone VARCHAR(20),
  avatar_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users hanya bisa akses profile mereka
CREATE POLICY "Users can only access their own profile"
  ON public.user_profiles
  FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create trigger untuk auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## 🔐 Step 3: Authentication Setup

### Enable Email Authentication

1. Pergi ke **Authentication** → **Providers**
2. Pastikan **Email** sudah enabled
3. Klik Email untuk configure:
   - **Confirm email**: Enabled (recommended)
   - **Secure email change**: Enabled
   - **Double confirm changes**: Enabled

### Configure Email Templates

1. Pergi ke **Authentication** → **Email Templates**
2. Customize templates berikut:

#### a) Confirm Signup Email
```
Subjek: Confirm your signup
Body:
---
Hi there!

Follow this link to confirm your user:
{{ .ConfirmationURL }}

If you didn't create this account, you can ignore this message.
```

#### b) Magic Link Email
```
Subjek: Your magic link
Body:
---
Follow this link to login to your account:
{{ .SiteURL }}/auth?token={{ .Token }}&type=magiclink
```

#### c) Reset Password Email (PENTING untuk Forgot Password feature)
```
Subjek: Reset your password
Body:
---
Hi there!

Follow this link to reset the password for your account:
{{ .RecoveryURL }}

If you didn't request this, you can ignore this message.
```

#### d) Confirm Email Change
```
Subjek: Confirm your email change
Body:
---
Follow this link to confirm the new email address for your account:
{{ .ConfirmationURL }}

If you didn't request this, you can ignore this message.
```

### Settings di Authentication

1. Pergi ke **Authentication** → **Policies**
2. Configure:
   - **Confirm email**: ON (users must verify email)
   - **Disallow sign ups**: OFF (allow registrasi)
   - **Auto confirm user**: OFF (require email verification)

---

## 📧 Step 4: Email Configuration (PENTING untuk Forgot Password)

### Option A: Supabase Email Service (Free tier limitation)

Supabase free tier limited ke 4 emails/hour. Untuk production, gunakan custom email provider.

### Option B: Resend Integration (Recommended)

Kami sudah setup Resend di project. Untuk production emails:

1. Buat akun di [Resend.com](https://resend.com)
2. Get API key dari dashboard Resend
3. Setup di `.env.local`:
```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
```

Resend digunakan untuk email transaksional (laporan, notifikasi).

### Option C: SendGrid Integration

1. Buat akun di [SendGrid](https://sendgrid.com)
2. Di Supabase → Auth → Email Templates → SMTP
3. Configure SMTP settings

---

## 🎯 Step 5: Configure Auth Redirect URL

Penting untuk forgot password feature!

1. Pergi ke **Authentication** → **URL Configuration**
2. Add **Redirect URLs**:
   ```
   http://localhost:3000
   http://localhost:3000/auth
   http://localhost:3000/auth/reset-password
   https://yourdomain.com
   https://yourdomain.com/auth
   https://yourdomain.com/auth/reset-password
   ```

3. Configure **Site URL** (untuk email links):
   ```
   http://localhost:3000  (development)
   https://yourdomain.com (production)
   ```

---

## 🛡️ Step 6: Security & Row Level Security (RLS)

### Check RLS Status
```sql
-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

### Recommended RLS Rules Summary

| Table | Rule | Access |
|-------|------|--------|
| `transactions` | Users can only access own | SELECT/INSERT/UPDATE/DELETE |
| `user_profiles` | Users can only access own | SELECT/INSERT/UPDATE/DELETE |

---

## 🧪 Step 7: Test Connection

### Test di Node/Browser Console

```javascript
import { supabase } from '@/lib/supabase';

// Test 1: Get current user
const { data: { user } } = await supabase.auth.getUser();
console.log('Current user:', user);

// Test 2: Get transactions
const { data, error } = await supabase
  .from('transactions')
  .select('*');
console.log('Transactions:', data);
console.log('Error:', error);

// Test 3: Forgot password flow
const { data, error } = await supabase.auth.resetPasswordForEmail('user@email.com', {
  redirectTo: 'http://localhost:3000/auth/reset-password'
});
console.log('Reset email sent:', data);
```

---

## 📱 Step 8: Configure Webhooks (Optional)

For advanced features like notifications:

1. Pergi ke **Database** → **Webhooks**
2. Create webhook untuk events:
   - `INSERT` on transactions
   - `UPDATE` on transactions
   - `DELETE` on transactions

Example webhook payload:
```json
{
  "type": "INSERT",
  "table": "transactions",
  "record": {
    "id": 123,
    "user_id": "uuid-xxx",
    "amount": 50000,
    "category": "Makan"
  }
}
```

---

## 🔄 Step 9: Backup & Restore

### Automatic Backups
Supabase automatically backs up setiap hari. Settings ada di **Settings** → **Backups**

### Manual Backup
```bash
# Backup database
pg_dump postgresql://user:password@host/database > backup.sql

# Restore
psql postgresql://user:password@host/database < backup.sql
```

---

## 📊 Step 10: Monitor & Analytics

### Check Database Stats
1. Pergi ke **Database** → **Database**
2. Lihat:
   - Storage used
   - Active connections
   - Query performance

### Check Auth Logs
1. Pergi ke **Authentication** → **Logs**
2. Monitor:
   - Sign ups
   - Login attempts
   - Password resets
   - Email confirmations

---

## 🚀 Environment Variables Summary

```env
# Supabase Core
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Email Service (Resend untuk transactional emails)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx

# AI Service (Gemini untuk scan)
GEMINI_API_KEY=your-gemini-api-key

# WhatsApp Service
FONNTE_TOKEN=your-fonnte-token

# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000
```

---

## ⚠️ Common Issues & Solutions

### Issue 1: "CORS Error" saat fetch dari API
**Solution**: 
1. Buka Supabase Dashboard
2. Pergi ke **Settings** → **CORS**
3. Add your domain:
```
http://localhost:3000
https://yourdomain.com
```

### Issue 2: "Row Level Security policy violates" 
**Solution**:
- Verify user is authenticated
- Check RLS policies match user_id dengan auth.uid()

### Issue 3: "Email not confirmed" 
**Solution**:
- User harus confirm email dari link yang dikirim
- Di development, bisa disable email confirmation di Auth Policies

### Issue 4: "Reset password link expired"
**Solution**:
- Default token validity: 24 hours
- Bisa adjust di **Authentication** → **Policies** → Token expiration

### Issue 5: "Cannot read property 'data' of undefined"
**Solution**:
- Pastikan user sudah login
- Check Network tab untuk API response
- Verify API keys di .env.local

---

## 📚 Useful Links

- [Supabase Docs](https://supabase.com/docs)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Supabase Database](https://supabase.com/docs/guides/database)
- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Webhooks](https://supabase.com/docs/guides/database/webhooks)

---

## ✅ Setup Checklist

- [ ] Create Supabase project
- [ ] Get API Keys (URL & Anon Key)
- [ ] Add API keys ke .env.local
- [ ] Create `transactions` table dengan RLS
- [ ] Create `user_profiles` table (optional)
- [ ] Enable Email authentication
- [ ] Configure email templates (esp. reset password)
- [ ] Set Site URL & Redirect URLs
- [ ] Test connection di console
- [ ] Configure CORS jika needed
- [ ] Test authentication flow (signup, login, forgot password)
- [ ] Test transactions CRUD operations
- [ ] Setup monitoring di Auth Logs
- [ ] Document credentials (store in secure place)

---

## 🔐 Security Best Practices

1. ✅ **Never commit API keys** ke Git (use .env.local)
2. ✅ **Rotate API keys** regularly di production
3. ✅ **Enable RLS** untuk semua tables
4. ✅ **Use Row Level Security policies** bukan app-level security
5. ✅ **Limit Anon Key** - pastikan only public access
6. ✅ **Use Service Role Key** hanya di backend (never client-side)
7. ✅ **Enable 2FA** untuk Supabase account
8. ✅ **Monitor Audit Logs** untuk suspicious activities

---

Last Updated: April 18, 2026
