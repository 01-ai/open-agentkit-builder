export interface Template {
  name: string
  user_id: string
  template_id: string
  is_prebuilt: boolean
  config: {
    category: string | null
    logo: string | null
    description: string | null
    features: string[]
  }

  deploy_status?: 'in_progress' | 'completed'
  accessible_url?: string
}
