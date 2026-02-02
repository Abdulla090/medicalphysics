<div align="center">

# 🔬 Medical Physics Platform

### The Premier Kurdish Educational Resource for Medical Imaging

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Convex](https://img.shields.io/badge/Convex-FF6B6B?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgZmlsbD0id2hpdGUiLz48L3N2Zz4=&logoColor=white)](https://www.convex.dev/)

<br />

<img src="https://img.shields.io/badge/Status-Active-success?style=flat-square" alt="Status" />
<img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="License" />
<img src="https://img.shields.io/badge/PRs-Welcome-brightgreen?style=flat-square" alt="PRs Welcome" />

---

**[Live Demo](https://medicalphysics.vercel.app)** · **[Report Bug](https://github.com/Abdulla090/medicalphysics/issues)** · **[Request Feature](https://github.com/Abdulla090/medicalphysics/issues)**

</div>

<br />

## ⚡ Overview

A cutting-edge educational platform built for **Kurdish medical students** and professionals. Master radiology techniques, explore 3D anatomy, and analyze medical imaging—all in Kurdish Sorani.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   📚 Video Lessons    →    Interactive medical imaging courses  │
│   🔬 DICOM Viewer     →    Professional-grade image analysis    │
│   🧠 3D Anatomy       →    Explore human body in 3D             │
│   📊 Progress Track   →    Monitor your learning journey        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

<br />

## 🎯 Key Features

<table>
<tr>
<td width="50%">

### 📖 Educational Content
- **Structured Courses** — Comprehensive radiology curriculum
- **Video Lessons** — High-quality instructional content
- **Quizzes** — Test your knowledge with interactive assessments
- **Progress Tracking** — Monitor completion across all courses

</td>
<td width="50%">

### 🔬 Medical Tools
- **X-ray Calculator** — AI-powered mAs & kVp parameter calculation
- **Anatomy Atlas** — Interactive atlas for X-ray, CT, MRI & Ultrasound
- **DICOM Viewer** — View CT, MRI, and X-ray images
- **Multi-plane Reconstruction** — Axial, Sagittal, Coronal views
- **Window/Level Control** — Professional image adjustments

</td>
</tr>
<tr>
<td width="50%">

### 🧬 3D Visualization
- **Interactive Anatomy** — Explore the human body
- **Real-time Rendering** — Powered by Three.js
- **Annotation System** — Learn anatomical structures
- **Mobile Optimized** — Works on any device

</td>
<td width="50%">

### 🌐 Platform
- **Kurdish Localization** — Full Sorani language support
- **RTL Layout** — Native right-to-left interface
- **Dark/Light Mode** — Eye-friendly themes
- **PWA Ready** — Install as native app

</td>
</tr>
</table>

<br />

## 🛠 Tech Stack

<div align="center">

| Frontend | Backend | Database | Styling |
|:--------:|:-------:|:--------:|:-------:|
| React 18 | Convex | Convex DB | Tailwind CSS |
| TypeScript | Edge Functions | Real-time Sync | shadcn/ui |
| Vite | Supabase Auth | — | Radix UI |
| Three.js | — | — | Lucide Icons |

</div>

<br />

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/Abdulla090/medicalphysics.git

# Navigate to project
cd medicalphysics

# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Variables

Create a `.env` file in the root directory:

```env
VITE_CONVEX_URL=your_convex_url
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

<br />

## 📁 Project Structure

```
medicalphysics/
├── src/
│   ├── components/        # React components
│   │   ├── ui/           # shadcn/ui components
│   │   ├── Navbar.tsx    # Navigation
│   │   └── ...
│   ├── pages/            # Route pages
│   │   ├── Index.tsx     # Home
│   │   ├── Courses.tsx   # Course listing
│   │   ├── ImageViewerDemo.tsx  # DICOM viewer
│   │   └── admin/        # Admin dashboard
│   ├── contexts/         # React contexts
│   ├── hooks/            # Custom hooks
│   └── lib/              # Utilities
├── convex/               # Backend functions
├── public/               # Static assets
│   └── 3dmodel/         # 3D anatomy models
└── ...
```

<br />

## 🖥 Screenshots

<div align="center">
<table>
<tr>
<td align="center"><strong>Home Page</strong></td>
<td align="center"><strong>DICOM Viewer</strong></td>
</tr>
<tr>
<td>Modern hero section with course stats</td>
<td>Professional medical image analysis</td>
</tr>
<tr>
<td align="center"><strong>3D Anatomy</strong></td>
<td align="center"><strong>Course Player</strong></td>
</tr>
<tr>
<td>Interactive body exploration</td>
<td>Video lessons with progress</td>
</tr>
</table>
</div>

<br />

## 🔧 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npx convex dev` | Start Convex backend |

<br />

## 🤝 Contributing

Contributions are what make the open source community amazing. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

<br />

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

<br />

## 📬 Contact

**Abdulla** — [@Abdulla090](https://github.com/Abdulla090)

Project Link: [https://github.com/Abdulla090/medicalphysics](https://github.com/Abdulla090/medicalphysics)

<br />

---

<div align="center">

**Built with ❤️ for Kurdish Medical Students**

<sub>© 2026 Medical Physics Platform. All rights reserved.</sub>

</div>
