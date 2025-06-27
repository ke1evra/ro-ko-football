# Payload SaaS Starter - AI Assistant Guide

## Project Overview

This is a modern SaaS starter kit built with Next.js 15 and Payload CMS, designed to accelerate SaaS development. The project uses TypeScript, PostgreSQL, and includes a complete authentication system with role-based access control.

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **CMS**: Payload CMS 3.43.0
- **Database**: PostgreSQL with Payload adapter
- **Language**: TypeScript 5.7.3
- **Styling**: Tailwind CSS v4 with Shadcn UI components
- **Storage**: Vercel Blob Storage (with optional Cloudflare R2/AWS S3 support)
- **Node**: v18.20.2+ or v20.9.0+
- **Package Manager**: pnpm

## Project Structure

```
/src
  /app                 # Next.js App Router
    /(frontend)        # Frontend routes
      /(admin)         # Protected admin routes (requires authentication)
      /(auth)          # Authentication routes (login, register)
      /(site)          # Public site routes
    /(payload)         # Payload CMS routes
  /collections         # Payload collections (Users, Media)
  /components          # React components
    /auth              # Authentication components
    /ds                # Design system components
    /site              # Site components (header, footer)
    /theme             # Theme components (dark/light mode)
    /ui                # Shadcn UI components
  /lib                 # Utility functions
  /middleware.ts       # Next.js middleware for route protection
  /payload.config.ts   # Payload CMS configuration
  /payload-types.ts    # Auto-generated Payload types
```

## Key Features

### Authentication System
- HTTP-only cookies for secure authentication
- Email/password registration and login with email verification
- Password reset functionality via email
- Role-based access control (admin/user roles)
- Password strength validation
- "Remember me" functionality (30-day vs 1-day sessions)
- Protected routes with middleware
- Automatic redirects for authenticated users accessing auth pages
- Email service integration with Resend
- Toast notifications for all auth feedback
- Components in `/src/components/auth/`

### Design System
- Dark/light mode with theme persistence
- Shadcn UI components
- Tailwind CSS for styling
- Reusable components in `/src/components/ui/`

## Development Commands

```bash
# Install dependencies
pnpm install

# Development server
pnpm dev

# Safe development (clears .next cache)
pnpm devsafe

# Build for production
pnpm build

# Start production server
pnpm start

# Generate Payload import map
pnpm generate:importmap

# Generate TypeScript types
pnpm generate:types

# Run linter
pnpm lint

# Access Payload CLI
pnpm payload
```

## Environment Variables

Required environment variables (see `.env.example`):

```bash
# Database
DATABASE_URI=postgres://postgres:<password>@127.0.0.1:5432/your-database-name

# Payload secret key
PAYLOAD_SECRET=YOUR_SECRET_HERE

# Email Configuration (Resend)
RESEND_API_KEY=re_xxxxxxxx
EMAIL_FROM=noreply@yourdomain.com
APP_URL=http://localhost:3000

# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN=YOUR_READ_WRITE_TOKEN_HERE

# Optional: Cloudflare R2
R2_ACCESS_KEY_ID=YOUR_ACCESS_KEY_ID_HERE
R2_SECRET_ACCESS_KEY=YOUR_SECRET_ACCESS_KEY_HERE
R2_BUCKET=YOUR_BUCKET_HERE
R2_ENDPOINT=YOUR_ENDPOINT_HERE
```

## Important Files

### Configuration
- `/src/payload.config.ts` - Payload CMS configuration
- `/next.config.mjs` - Next.js configuration
- `/tsconfig.json` - TypeScript configuration
- `/tailwind.config.js` - Tailwind CSS configuration

### Collections
- `/src/collections/Users.ts` - User collection with authentication
- `/src/collections/Media.ts` - Media/file upload collection

### Authentication
- `/src/lib/auth.ts` - Authentication utilities and server actions
- `/src/lib/email.ts` - Email service with Resend integration
- `/src/middleware.ts` - Route protection middleware
- `/src/components/auth/` - Authentication UI components
  - `login-form.tsx` - Login form with toast notifications
  - `register-form.tsx` - Registration form with email verification
  - `logout-button.tsx` - Client-side logout with router navigation
  - `logout-form.tsx` - Server action logout form (works without JS)
  - `forgot-password-form.tsx` - Password reset request form
  - `email-verification-banner.tsx` - Email verification status banner
- `/src/app/api/auth/verify-email/route.ts` - Email verification endpoint
- `/src/app/(frontend)/(auth)/forgot-password/` - Password reset request page
- `/src/app/(frontend)/(auth)/reset-password/` - Password reset page

### Layouts
- `/src/app/(frontend)/layout.tsx` - Main frontend layout
- `/src/app/(frontend)/(admin)/layout.tsx` - Admin area layout
- `/src/app/(payload)/layout.tsx` - Payload CMS layout

## Coding Guidelines

### General Rules
1. Use TypeScript for all new files
2. Follow the existing project structure
3. Use server components by default, client components only when necessary
4. Utilize Payload's type generation for type safety
5. Use the design system components from `/src/components/ui/`

### Authentication
- Always use the authentication utilities from `/src/lib/auth.ts`
- Protected routes should be placed under `/(admin)/` directory
- Use middleware for route protection rather than client-side checks
- Auth pages automatically redirect authenticated users to dashboard
- All auth feedback uses toast notifications for better UX
- For logout: use `LogoutButton` (client-side) or `LogoutForm` (server action)
- Client logout uses `clearAuthCookies()` + router navigation
- Server logout uses `logoutUser()` server action with redirect

### Styling
- Use Tailwind CSS classes
- Follow the existing theme system for dark/light mode support
- Use Shadcn UI components when available
- Custom components should go in `/src/components/`

### Database & CMS
- Define collections in `/src/collections/`
- Run `pnpm generate:types` after modifying collections
- Use Payload's built-in authentication for the Users collection
- Media uploads are configured to use Vercel Blob Storage by default

### API Routes
- Place custom API routes in `/src/app/api/`
- Payload API routes are automatically handled at `/api/`
- GraphQL endpoint is available at `/api/graphql`

### Best Practices
1. Keep components small and focused
2. Use proper TypeScript types (generated from Payload)
3. Handle errors gracefully
4. Follow Next.js 15 best practices (App Router, Server Components)
5. Use environment variables for sensitive data
6. Test authentication flows thoroughly

## Deployment

The project is configured for Vercel deployment:
1. Ensure all environment variables are set in Vercel
2. The project uses Vercel Blob Storage for media uploads
3. PostgreSQL database connection is required
4. Use the "Deploy with Vercel" button in the README for quick setup

## Common Tasks

### Adding a New Collection
1. Create a new file in `/src/collections/`
2. Add the collection to `/src/payload.config.ts`
3. Run `pnpm generate:types` to update TypeScript types

### Creating Protected Pages
1. Add pages under `/src/app/(frontend)/(admin)/`
2. The middleware will automatically protect these routes
3. Use authentication utilities to check user roles if needed

### Customizing the Theme
1. Modify theme components in `/src/components/theme/`
2. Update Tailwind configuration if needed
3. Ensure dark mode compatibility

### Working with Forms
1. Use the existing form components as examples
2. Implement proper validation using `/src/lib/validation.ts`
3. Handle form submissions with Server Actions

### Email and Authentication Features
1. Email verification is automatic on registration
2. Password reset flow includes email verification
3. Email templates are customizable in `/src/lib/email.ts`
4. Users collection includes email verification fields
5. Use `EmailVerificationBanner` component for unverified users
6. Security headers are configured in `next.config.mjs`