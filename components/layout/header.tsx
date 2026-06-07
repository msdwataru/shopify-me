'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { User, LogOut, Menu } from 'lucide-react'
import { toast } from 'sonner'

interface HeaderProps {
  email?: string
  onMenuClick?: () => void
}

export function Header({ email, onMenuClick }: HeaderProps) {
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    toast.success('ログアウトしました')
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="h-12 border-b bg-white flex items-center justify-between px-4 shrink-0">
      <button
        type="button"
        onClick={onMenuClick}
        className="lg:hidden -ml-2 p-2 rounded text-gray-600 hover:bg-gray-100"
        aria-label="メニューを開く"
      >
        <Menu className="h-5 w-5" />
      </button>
      <div className="hidden lg:block" />
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 px-2 py-1 rounded text-sm hover:bg-gray-100 text-gray-700">
          <User className="h-4 w-4" />
          <span className="max-w-[180px] truncate">{email ?? 'ユーザー'}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
            <LogOut className="h-4 w-4 mr-2" />
            ログアウト
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
