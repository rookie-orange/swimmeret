import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { LoginForm } from './-components/login-form'

function LoginPage() {
  const navigate = useNavigate()

  return (
    <main className="flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-12 text-foreground">
      <div className="w-full max-w-md">
        <LoginForm onSuccess={() => void navigate({ to: '/' })} />
      </div>
    </main>
  )
}

export const Route = createFileRoute('/(auth)/login')({
  component: LoginPage,
})
