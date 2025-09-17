import { useAuth } from '@/hooks/useAuth'
import AuthLayout from '@/components/auth/AuthLayout'
import CustomerPortal from './CustomerPortal'
import AdminPortal from './AdminPortal'

const Portal = () => {
  const { user, customer, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-soft-gray flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-trust-blue mx-auto mb-4"></div>
          <p className="text-warm-gray">Laddar...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <AuthLayout />
  }

  // Show admin portal if user is admin, otherwise customer portal
  return customer?.is_admin ? <AdminPortal /> : <CustomerPortal />
}

export default Portal