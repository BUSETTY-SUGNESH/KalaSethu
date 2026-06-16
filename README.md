# KalaSetu

A comprehensive global digital ecosystem for Indian art, built to connect collectors with verified artisans. 

## Overview
KalaSetu combines a Marketplace, Live Auction System, Artist Verification, Community Forums (CharchaSabha), and Learning Masterclasses into a single unified platform. 

It is built with **Next.js**, **Zustand**, and **Firebase** (Firestore, Auth, Storage, Cloud Functions).

## Features
* **Auth**: Firebase Authentication with protected routes and server-side middleware.
* **Marketplace**: Browse authenticated art, filter by category/medium, add to cart.
* **Live Auctions**: Real-time bidding engine with anti-sniping and pubsub closure via Firebase Cloud Functions.
* **CharchaSabha**: Community discussion forums with threads, replies, and like-aggregation.
* **Dashboards**: Dedicated dashboards for Collectors, Artists, and Admins.
* **Verification System**: Rigorous application flow for artisans to get verified.
* **Cloud Functions**: Robust backend for order processing, notifications, moderation, and aggregation.

## Setup Instructions

### Prerequisites
- Node.js 18+
- Firebase CLI (`npm i -g firebase-tools`)

### Environment Variables
1. Copy `.env.local.example` to `.env.local`
2. Fill in your Firebase Project credentials.

### Installation
```bash
# Install root dependencies
npm install

# Install Cloud Functions dependencies
cd functions
npm install
cd ..
```

### Running Locally
Run the Next.js development server:
```bash
npm run dev
```

Run the Firebase Emulators (for backend):
```bash
firebase emulators:start
```

## Architecture
- `app/`: Next.js App Router containing pages and layouts.
- `lib/services/`: Service abstraction layer communicating with Firebase.
- `lib/stores/`: Zustand global state management.
- `lib/firebase/`: Firebase initialization and helpers.
- `functions/`: Firebase Cloud Functions backend.
