import { Clock } from 'lucide-react'

export function ComingSoon() {
  return (
    <div className="flex-1 p-8 flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="mb-6 flex justify-center">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center">
            <Clock className="w-12 h-12 text-gray-400" />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Coming Soon</h1>
        <p className="text-gray-600 text-lg mb-8">
          This page is under development and will be available soon.
        </p>
      </div>
    </div>
  )
}
