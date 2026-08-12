export default function LoadingScreen() {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-tchikong-500 border-t-transparent" />
        <p className="mt-4 text-sm text-gray-500">Chargement...</p>
      </div>
    </div>
  )
}
