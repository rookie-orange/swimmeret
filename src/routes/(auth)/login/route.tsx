import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { LOGIN_REVEAL_STORAGE_KEY } from '@/lib/auth'

import { LoginForm } from './-components/login-form'

function LoginPage() {
  const navigate = useNavigate()

  const handleSuccess = () => {
    try {
      window.sessionStorage.setItem(LOGIN_REVEAL_STORAGE_KEY, 'pending')
    } catch {
      // The reveal is a visual enhancement; navigation should still continue.
    }

    void navigate({ to: '/' })
  }

  return (
    <main className="flex h-full min-h-0 items-center justify-center overflow-hidden bg-primary px-6 py-12 text-primary-foreground">
      <div className="w-full max-w-md">
        <LoginForm onSuccess={handleSuccess} />
      </div>
    </main>
  )
}

export const Route = createFileRoute('/(auth)/login')({
  component: LoginPage,
})
