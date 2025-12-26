# WMS Cikarang - Warehouse Management System

Multi-warehouse WMS system built with Next.js 15, TypeScript, and Tailwind CSS. Currently using mock data, ready for Supabase backend migration.

## 🏢 Project Overview

**WMS Cikarang** adalah sistem manajemen gudang multi-warehouse untuk distributor minuman dengan fitur:

- ✅ Multi-warehouse isolation (Cikarang & Bandung)
- ✅ Role-based access control (Developer, Admin Cabang, Admin Warehouse)
- ✅ Real-time stock tracking dengan QR code scanning
- ✅ FEFO (First Expired First Out) untuk outbound
- ✅ Stock opname dengan rekonsel
- ✅ NPL (Nota Pengembalian Lapangan) & Permutasi
- ✅ Warehouse layout visualization

## 📊 Current Status

- **Frontend**: ✅ 100% Complete
- **Mock Data**: ✅ 100% Complete
- **Backend**: 🚀 Ready for Supabase implementation
- **Documentation**: ✅ Up-to-date (27 Des 2025)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm/yarn/pnpm/bun

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

### Default Login Credentials

```
Developer:
- Username: dev_haikal
- Password: dev123

Admin Cabang Cikarang:
- Username: admin_ckr
- Password: admin123

Admin Warehouse Cikarang:
- Username: staff_ckr1
- Password: staff123
```

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── login/             # Authentication
│   ├── inbound/           # Inbound transactions
│   ├── outbound/          # Outbound transactions (FEFO)
│   ├── stock-list/        # Real-time stock list
│   ├── stock-list-master/ # Master data management
│   ├── stock-opname/      # Stock opname input
│   ├── npl/               # Nota Pengembalian Lapangan
│   ├── permutasi/         # Stock relocation
│   └── admin-management/  # User management
│
├── components/            # React components
│   ├── navigation.tsx     # Main navigation
│   ├── inbound-form.tsx   # Inbound transaction form
│   ├── outbound-form.tsx  # Outbound with FEFO logic
│   ├── npl-form.tsx       # NPL form
│   ├── permutasi-form.tsx # Permutasi form
│   ├── warehouse-layout.tsx # Warehouse visualization
│   └── qr-scanner.tsx     # QR code scanner
│
└── lib/
    ├── mock/              # Mock data (production-ready structure)
    │   ├── product-master.ts
    │   ├── users-mock.ts
    │   ├── stocklistmock.ts
    │   ├── transaction-history.ts
    │   ├── npl-history.ts
    │   └── permutasi-history.ts
    │
    └── utils/             # Utility functions
        └── warehouse-utils.ts
```

## 📚 Documentation

- **[BACKEND-READINESS-ANALYSIS.md](./BACKEND-READINESS-ANALYSIS.md)** - Backend migration guide (100% ready)
- **[database-schema.dbml](./database-schema.dbml)** - PostgreSQL schema (16 tables)
- **[PROJECT-LOGIC-ANALYSIS.md](./PROJECT-LOGIC-ANALYSIS.md)** - Business logic documentation
- **[MOCK-USAGE-DOCUMENTATION.md](./MOCK-USAGE-DOCUMENTATION.md)** - Mock data usage guide
- **[database-sample-data.md](./database-sample-data.md)** - Sample data & test cases

## 🔧 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Hooks (useState, useEffect, useMemo)
- **Backend (Planned)**: Supabase (PostgreSQL + RLS)
- **Authentication (Planned)**: Supabase Auth

## ✅ Features

### Implemented Features
- [x] Multi-warehouse context switching
- [x] Role-based access control
- [x] QR code scanning for inbound/outbound
- [x] FEFO logic for outbound
- [x] Real-time stock tracking
- [x] Stock opname with rekonsel
- [x] NPL (product returns)
- [x] Permutasi (stock relocation)
- [x] Warehouse layout visualization
- [x] Transaction history tracking
- [x] Master data management (products, clusters, expeditions)

### Planned Features (Post-Backend)
- [ ] Real-time database sync (Supabase)
- [ ] Row-level security (RLS)
- [ ] Email notifications
- [ ] Advanced reporting
- [ ] Mobile app (React Native)

## 🚀 Next Steps

1. ✅ **Pre-requisites Complete** (All minor fixes resolved)
2. 🚀 **Create Supabase Project** (Start here!)
3. 🚀 **Run Phase 1: Schema Setup** (1 week)
4. 🚀 **Implement Authentication** (Phase 2)
5. 🚀 **Migrate Transaction Features** (Phase 3)

See **[BACKEND-READINESS-ANALYSIS.md](./BACKEND-READINESS-ANALYSIS.md)** for detailed implementation plan.

## 🤝 Contributing

This is a private project. For questions or issues, contact the development team.

## 📄 License

Proprietary - All rights reserved.

---

*Last Updated: 26 Desember 2025*  
*Status: ✅ Frontend Complete - Ready for Backend Implementation*
