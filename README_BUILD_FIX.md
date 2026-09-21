# Vercel Build Fix — 21 Sep 2026

Fixed the syntax error in `src/routes/dashboard.tsx` that caused TanStack Router route generation to fail on Vercel.

The broken `Cash Out` button JSX was missing the closing `}` for its `onClick` handler. It is now:

```tsx
onClick={() => window.dispatchEvent(new Event("betashine:open-withdraw"))}
```

The payment amount remains **TZS 16,000** for both automatic payment and Lipa Namba/manual payment.

Deploy the project root (this archive contains the project files directly at the archive root).
