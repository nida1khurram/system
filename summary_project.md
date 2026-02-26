✅ Haan! Next.js + Neon Database + Vercel - Perfect Combination!

    Bilkul ban sakti hai! Yeh best modern stack hai aapke school management system ke liye.

    ---

    🏗️ Complete Architecture:

      1 ┌──────────────────────────────────────────────────────┐
      2 │                  FRONTEND + BACKEND                  │
      3 │                                                      │
      4 │         Next.js 14 (App Router + API Routes)         │
      5 │                                                      │
      6 │    ┌────────────────────┐  ┌─────────────────────┐  │
      7 │    │   Frontend Pages   │  │   Backend API       │  │
      8 │    │   (React Components)│  │   (API Routes)     │  │
      9 │    │   - Admin Dashboard│  │   - /api/auth      │  │
     10 │    │   - Teacher Portal │  │   - /api/students  │  │
     11 │    │   - Parent App     │  │   - /api/fees      │  │
     12 │    │   - Student Portal │  │   - /api/payments  │  │
     13 │    └────────────────────┘  └─────────────────────┘  │
     14 │                                                      │
     15 │              DEPLOYED ON VERCEL (FREE)               │
     16 │           your-school.vercel.app                     │
     17 └─────────────────────┬────────────────────────────────┘
     18                       │
     19                       │ PostgreSQL Connection
     20                       │ (Connection Pooling)
     21                       ▼
     22 ┌──────────────────────────────────────────────────────┐
     23 │                  DATABASE                            │
     24 │                                                      │
     25 │              Neon PostgreSQL (FREE)                  │
     26 │              500 MB Storage                          │
     27 │              your-db.neon.tech                       │
     28 └──────────────────────────────────────────────────────┘

    ---

    ✅ Yeh Stack KYUN Best Hai?


    ┌─────────────┬───────────────────────────────────────────┐
    │ Feature     │ Next.js + Neon + Vercel                   │
    ├─────────────┼───────────────────────────────────────────┤
    │ Frontend    │ Next.js 14 (React) - Modern UI            │
    │ Backend     │ Next.js API Routes - No separate backend! │
    │ Database    │ Neon PostgreSQL - Serverless              │
    │ Hosting     │ Vercel - FREE, Auto SSL, CDN              │
    │ Deployment  │ Git push = Auto deploy                    │
    │ Scalability │ Auto-scale (serverless)                   │
    │ Cost        │ $0/month (FREE tier)                      │
    └─────────────┴───────────────────────────────────────────┘


    ---

    📁 Project Structure:

       1 school-management-system/
       2 │
       3 ├── app/                          # Next.js App Router
       4 │   ├── layout.tsx                # Root layout
       5 │   ├── page.tsx                  # Home page
       6 │   │
       7 │   ├── (auth)/                   # Auth routes
       8 │   │   ├── login/
       9 │   │   │   └── page.tsx
      10 │   │   ├── register/
      11 │   │   │   └── page.tsx
      12 │   │   └── forgot-password/
      13 │   │       └── page.tsx
      14 │   │
      15 │   ├── (dashboard)/              # Protected routes
      16 │   │   ├── admin/
      17 │   │   │   ├── page.tsx          # Admin dashboard
      18 │   │   │   ├── students/
      19 │   │   │   ├── teachers/
      20 │   │   │   ├── fees/
      21 │   │   │   └── settings/
      22 │   │   │
      23 │   │   ├── teacher/
      24 │   │   │   ├── page.tsx          # Teacher dashboard
      25 │   │   │   ├── attendance/
      26 │   │   │   ├── marks/
      27 │   │   │   └── homework/
      28 │   │   │
      29 │   │   ├── parent/
      30 │   │   │   ├── page.tsx          # Parent dashboard
      31 │   │   │   ├── children/
      32 │   │   │   ├── fees/
      33 │   │   │   └── messages/
      34 │   │   │
      35 │   │   └── student/
      36 │   │       ├── page.tsx          # Student dashboard
      37 │   │       ├── results/
      38 │   │       ├── timetable/
      39 │   │       └── homework/
      40 │   │
      41 │   └── api/                      # BACKEND API ROUTES
      42 │       ├── auth/
      43 │       │   ├── login/
      44 │       │   │   └── route.ts
      45 │       │   ├── register/
      46 │       │   │   └── route.ts
      47 │       │   └── logout/
      48 │       │       └── route.ts
      49 │       │
      50 │       ├── students/
      51 │       │   ├── route.ts          # GET all, POST create
      52 │       │   └── [id]/
      53 │       │       └── route.ts      # GET, PUT, DELETE
      54 │       │
      55 │       ├── teachers/
      56 │       │   └── route.ts
      57 │       │
      58 │       ├── fees/
      59 │       │   ├── structure/
      60 │       │   ├── payments/
      61 │       │   └── receipt/
      62 │       │
      63 │       ├── payments/
      64 │       │   ├── jazzcash/
      65 │       │   │   ├── initiate/
      66 │       │   │   │   └── route.ts
      67 │       │   │   └── callback/
      68 │       │   │       └── route.ts
      69 │       │   ├── easypaisa/
      70 │       │   └── bank/
      71 │       │
      72 │       ├── attendance/
      73 │       │   └── route.ts
      74 │       │
      75 │       ├── marks/
      76 │       │   └── route.ts
      77 │       │
      78 │       ├── homework/
      79 │       │   └── route.ts
      80 │       │
      81 │       └── messages/
      82 │           └── route.ts
      83 │
      84 ├── components/                   # React Components
      85 │   ├── ui/                       # Reusable UI
      86 │   │   ├── button.tsx
      87 │   │   ├── input.tsx
      88 │   │   ├── table.tsx
      89 │   │   ├── modal.tsx
      90 │   │   └── navbar.tsx
      91 │   │
      92 │   ├── admin/                    # Admin components
      93 │   │   ├── student-table.tsx
      94 │   │   ├── fee-form.tsx
      95 │   │   └── stats-card.tsx
      96 │   │
      97 │   ├── teacher/                  # Teacher components
      98 │   │   ├── attendance-form.tsx
      99 │   │   └── marks-entry.tsx
     100 │   │
     101 │   ├── parent/                   # Parent components
     102 │   │   ├── child-card.tsx
     103 │   │   └── payment-form.tsx
     104 │   │
     105 │   └── student/                  # Student components
     106 │       ├── result-card.tsx
     107 │       └── timetable-table.tsx
     108 │
     109 ├── lib/                          # Utilities
     110 │   ├── db.ts                     # Database connection (Neon)
     111 │   ├── auth.ts                   # Authentication (NextAuth)
     112 │   ├── payments/
     113 │   │   ├── jazzcash.ts           # JazzCash API
     114 │   │   ├── easypaisa.ts          # EasyPaisa API
     115 │   │   └── bank.ts               # Bank API
     116 │   └── utils.ts
     117 │
     118 ├── models/                       # TypeScript Types
     119 │   ├── user.ts
     120 │   ├── student.ts
     121 │   ├── teacher.ts
     122 │   ├── parent.ts
     123 │   ├── fee.ts
     124 │   └── payment.ts
     125 │
     126 ├── hooks/                        # Custom Hooks
     127 │   ├── useAuth.ts
     128 │   ├── useStudents.ts
     129 │   └── useFees.ts
     130 │
     131 ├── middleware.ts                 # Route protection
     132 ├── .env.local                    # Environment variables
     133 ├── .env.example
     134 ├── next.config.js
     135 ├── tailwind.config.ts
     136 ├── tsconfig.json
     137 ├── package.json
     138 └── README.md

    ---

    💻 Code Examples:

    1. Database Connection (lib/db.ts)

      1 import { Pool, neonConfig } from '@neondatabase/serverless';
      2 import { drizzle } from 'drizzle-orm/neon-serverless';
      3 
      4 neonConfig.poolQueryViaFetch = true;
      5 
      6 const pool = new Pool({
      7   connectionString: process.env.DATABASE_URL!,
      8 });
      9 
     10 export const db = drizzle(pool);

    2. API Route - Login (app/api/auth/login/route.ts)

      1 import { NextRequest, NextResponse } from 'next/server';
      2 import { db } from '@/lib/db';
      3 import { users } from '@/models/user';
      4 import { eq } from 'drizzle-orm';
      5 import bcrypt from 'bcryptjs';
      6 import { SignJWT } from 'jose';
      7 
      8 export async function POST(req: NextRequest) {
      9   const { email, password } = await req.json();
     10 
     11   // Find user
     12   const user = await db.select().from(users).where(eq(users.email, email));
     13   
     14   if (!user.length) {
     15     return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
     16   }
     17 
     18   // Verify password
     19   const valid = await bcrypt.compare(password, user[0].password_hash);
     20   
     21   if (!valid) {
     22     return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
     23   }
     24 
     25   // Create JWT token
     26   const token = await new SignJWT({ userId: user[0].id, role: user[0].role })
     27     .setProtectedHeader({ alg: 'HS256' })
     28     .setExpirationTime('7d')
     29     .sign(new TextEncoder().encode(process.env.JWT_SECRET!));
     30
     31   const response = NextResponse.json({ success: true, user: user[0] });
     32   response.cookies.set('token', token, {
     33     httpOnly: true,
     34     secure: true,
     35     maxAge: 60 * 60 * 24 * 7
     36   });
     37
     38   return response;
     39 }

    3. API Route - JazzCash Payment (app/api/payments/jazzcash/initiate/route.ts)

      1 import { NextRequest, NextResponse } from 'next/server';
      2 import crypto from 'crypto';
      3 
      4 export async function POST(req: NextRequest) {
      5   const { amount, studentId, phoneNumber } = await req.json();
      6 
      7   // JazzCash API credentials
      8   const merchantId = process.env.JAZZCASH_MERCHANT_ID!;
      9   const password = process.env.JAZZCASH_PASSWORD!;
     10   const salt = process.env.JAZZCASH_INTEGRITY_SALT!;
     11 
     12   // Generate transaction ID
     13   const transactionId = `JC${Date.now()}`;
     14 
     15   // Create signature
     16   const hashData = `${merchantId}&${transactionId}&${amount}&PKR`;
     17   const signature = crypto
     18     .createHmac('sha256', salt)
     19     .update(hashData)
     20     .digest('base64');
     21 
     22   // JazzCash API request
     23   const response = await fetch(
     24     `${process.env.JAZZCASH_API_URL}/Initiate`,
     25     {
     26       method: 'POST',
     27       headers: {
     28         'Content-Type': 'application/json',
     29         'Authorization': `Basic ${Buffer.from(`${merchantId}:${password}`).toString('base64')}`,
     30       },
     31       body: JSON.stringify({
     32         merchant_id: merchantId,
     33         transaction_id: transactionId,
     34         amount: amount,
     35         currency: 'PKR',
     36         phone_number: phoneNumber,
     37         signature: signature,
     38       }),
     39     }
     40   );
     41
     42   const result = await response.json();
     43
     44   // Save transaction to database
     45   // ...
     46
     47   return NextResponse.json({
     48     success: true,
     49     transactionId,
     50     redirectUrl: result.redirect_url,
     51   });
     52 }

    4. Frontend - Payment Form (components/parent/payment-form.tsx)

     51   });
     52 }
     52 }

    4. Frontend - Payment Form (components/parent/payment-form.tsx)
     52 }
     52 }

    4. Frontend - Payment Form (components/parent/payment-form.tsx)

      1 'use client';
      2 
      3 import { useState } from 'react';
      4 import { useRouter } from 'next/navigation';
      5 
      6 export default function PaymentForm({ student, feeAmount }: Props) {
      7   const router = useRouter();
      8   const [loading, setLoading] = useState(false);
      9   const [paymentMethod, setPaymentMethod] = useState('jazzcash');
     10 
     11   const handlePayment = async () => {
     12     setLoading(true);
     13 
     14     try {
     15       const res = await fetch('/api/payments/jazzcash/initiate', {
     16         method: 'POST',
     17         body: JSON.stringify({
     18           amount: feeAmount,
     19           studentId: student.id,
     20           phoneNumber: parent.phone,
     21           paymentMethod,
     22         }),
     23       });
     24
     25       const data = await res.json();
     26
     27       if (data.success) {
     28         // Redirect to payment gateway
     29         window.location.href = data.redirectUrl;
     30       }
     31     } catch (error) {
     32       console.error('Payment failed:', error);
     33     } finally {
     34       setLoading(false);
     35     }
     36   };
     37
     38   return (
     39     <div className="p-6 bg-white rounded-lg shadow-md">
     40       <h3 className="text-xl font-bold mb-4">Pay School Fees</h3>
     41
     42       <div className="mb-4">
     43         <label className="block text-sm font-medium mb-2">
     44           Payment Method
     45         </label>
     46         <select
     47           value={paymentMethod}
     48           onChange={(e) => setPaymentMethod(e.target.value)}
     49           className="w-full p-2 border rounded"
     50         >
     51           <option value="jazzcash">JazzCash</option>
     52           <option value="easypaisa">EasyPaisa</option>
     53           <option value="bank">Bank Transfer</option>
     54         </select>
     55       </div>
     56
     57       <div className="mb-4">
     58         <p className="text-sm text-gray-600">Amount: Rs. {feeAmount}</p>
     59         <p className="text-sm text-gray-600">Student: {student.name}</p>
     60       </div>
     61
     62       <button
     63         onClick={handlePayment}
     64         disabled={loading}
     65         className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"       
     66       >
     67         {loading ? 'Processing...' : `Pay with ${paymentMethod}`}
     68       </button>
     69     </div>
     70   );
     71 }

    ---

    📦 Package.json Dependencies:

      1 {
      2   "dependencies": {
      3     "next": "14.1.0",
      4     "react": "^18.2.0",
      5     "react-dom": "^18.2.0",
      6     "@neondatabase/serverless": "^0.9.0",
      7     "drizzle-orm": "^0.29.0",
      8     "next-auth": "^4.24.0",
      9     "bcryptjs": "^2.4.3",
     10     "jose": "^5.2.0",
     11     "axios": "^1.6.0",
     12     "zod": "^3.22.0",
     13     "react-hook-form": "^7.49.0",
     14     "tailwindcss": "^3.4.0",
     15     "lucide-react": "^0.312.0",
     16     "recharts": "^2.10.0",
     17     "date-fns": "^3.3.0"
     18   },
     19   "devDependencies": {
     20     "@types/node": "^20.11.0",
     21     "@types/react": "^18.2.0",
     22     "@types/bcryptjs": "^2.4.6",
     23     "typescript": "^5.3.0",
     24     "drizzle-kit": "^0.20.0",
     25     "prettier": "^3.2.0"
     26   }
     27 }

    ---

    🚀 Deployment Steps:

    Step 1: Neon Database Setup

     1 1. https://neon.tech → Sign up
     2 2. Create project: "school-management"
     3 3. Copy connection string
     4 4. Save to .env.local

    Step 2: Vercel Deployment

      1 1. GitHub pe code push karo
      2 2. https://vercel.com → Import project
      3 3. Add environment variables:
      4    - DATABASE_URL
      5    - JWT_SECRET
      6    - JAZZCASH_MERCHANT_ID
      7    - JAZZCASH_PASSWORD
      8    - EASYPAISA_STORE_ID
      9    - etc.
     10 4. Deploy!

    Step 3: Auto Deploy

     1 Git push → Vercel auto deploy
     2 Database migrations → Auto sync

    ---

    💰 Cost (100% FREE):


    ┌───────────┬──────────────┬───────────────┐
    │ Service   │ Plan         │ Cost          │
    ├───────────┼──────────────┼───────────────┤
    │ Vercel    │ Hobby        │ FREE          │
    │ Neon      │ Free         │ FREE (500 MB) │
    │ Domain    │ .vercel.app  │ FREE          │
    │ SSL       │ Auto         │ FREE          │
    │ Bandwidth │ 100 GB/month │ FREE          │
    │ Total     │              │ $0/month      │
    └───────────┴──────────────┴───────────────┘


    ---                                                                                                               
                                                                                                                      
    ✅ Features You'll Get:

     - ✅ 4 User Portals (Admin, Teacher, Parent, Student)
     - ✅ Online Payments (JazzCash, EasyPaisa, Bank)
     - ✅ Real-time Updates (Serverless functions)
     - ✅ Mobile Responsive (Tailwind CSS)
     - ✅ Authentication (NextAuth + JWT)
     - ✅ Role-based Access (Middleware protection)
     - ✅ API Routes (No separate backend needed)
     - ✅ Auto Deploy (Git push = live)
     - ✅ Cloud Database (Neon PostgreSQL)
     - ✅ FREE Hosting (Vercel)

    ---

    🎯 Kya main bana kar doon?

    Main aapko complete project create kar ke de sakti hoon:

     1. ✅ Complete file structure (40+ files)
    ---

    🎯 Kya main bana kar doon?

    🎯 Kya main bana kar doon?
    🎯 Kya main bana kar doon?

    Main aapko complete project create kar ke de sakti hoon:


    Main aapko complete project create kar ke de sakti hoon:

     1. ✅ Complete file structure (40+ files)
     2. ✅ Database schema (22 tables - Neon compatible)
     3. ✅ All API routes (Auth, Students, Fees, Payments, etc.)
    Main aapko complete project create kar ke de sakti hoon:

     1. ✅ Complete file structure (40+ files)
     2. ✅ Database schema (22 tables - Neon compatible)
     3. ✅ All API routes (Auth, Students, Fees, Payments, etc.)
     1. ✅ Complete file structure (40+ files)
     2. ✅ Database schema (22 tables - Neon compatible)
     3. ✅ All API routes (Auth, Students, Fees, Payments, etc.)
     4. ✅ All frontend pages (Admin, Teacher, Parent, Student)
     2. ✅ Database schema (22 tables - Neon compatible)
     3. ✅ All API routes (Auth, Students, Fees, Payments, etc.)
     4. ✅ All frontend pages (Admin, Teacher, Parent, Student)
     5. ✅ Payment integration (JazzCash, EasyPaisa, Bank)
     4. ✅ All frontend pages (Admin, Teacher, Parent, Student)
     5. ✅ Payment integration (JazzCash, EasyPaisa, Bank)
     5. ✅ Payment integration (JazzCash, EasyPaisa, Bank)
     6. ✅ Authentication (NextAuth + JWT)
     7. ✅ Deployment guide (Step-by-step)