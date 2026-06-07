'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  Boxes,
  FolderOpen,
  Store,
  ScrollText,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', label: 'ダッシュボード', icon: LayoutDashboard },
  {
    href: '/products',
    label: '商品管理',
    icon: Package,
    children: [
      { href: '/collections', label: 'コレクション', icon: FolderOpen },
      { href: '/inventory', label: '在庫管理', icon: Boxes },
    ],
  },
  { href: '/brands', label: 'ブランド管理', icon: Store },
  { href: '/logs', label: '操作履歴', icon: ScrollText },
]

function isActivePath(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href)
}

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 shrink-0 border-r bg-white h-full flex flex-col">
      <div className="px-4 py-5 border-b">
        <div className="flex items-center gap-2">
          <Boxes className="h-6 w-6 text-blue-600" />
          <span className="font-bold text-sm leading-tight">ShopifyMe</span>
        </div>
      </div>
      <nav className="flex-1 py-4 px-2 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = isActivePath(pathname, item.href)
          return (
            <div key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
              {item.children && (
                <div className="mt-0.5 ml-4 pl-3 border-l space-y-0.5">
                  {item.children.map((child) => {
                    const ChildIcon = child.icon
                    const isChildActive = isActivePath(pathname, child.href)
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          'flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                          isChildActive
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                        )}
                      >
                        <ChildIcon className="h-3.5 w-3.5 shrink-0" />
                        {child.label}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
