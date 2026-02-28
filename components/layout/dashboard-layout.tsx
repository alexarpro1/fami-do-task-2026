"use client"

import type React from "react"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { useFamily } from "@/context/family-context"
import { useTranslation } from "@/hooks/use-translation"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarTrigger,
  SidebarInset,
  useSidebar,
} from "@/components/ui/sidebar"
import { ChildAvatar } from "@/components/child/child-avatar"
import { AppVersionFooter } from "@/components/ui/app-version-footer"
import { Home, CheckSquare, Gift, PawPrint, Sticker, Smile, Settings, ChevronDown, Scale, User, Gamepad2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface DashboardLayoutProps {
  children: React.ReactNode
}

function SidebarNavigation() {
  const pathname = usePathname()
  const { state, selectedChild, dispatch, isLoaded } = useFamily()
  const { t } = useTranslation()
  const { state: sidebarState, setOpenMobile } = useSidebar()
  const isCollapsed = sidebarState === "collapsed"

  const settings = state?.settings ?? {}
  const childrenArray = state?.children ?? []

  const shopEnabled = settings.shopEnabled ?? true
  const profileEnabled = settings.profileEnabled ?? true

  const navItems = [
    { href: "/", icon: Home, label: t.nav.home },
    { href: "/tasks", icon: CheckSquare, label: t.nav.tasks },
    { href: "/rules", icon: Scale, label: "Regeln" },
    ...(shopEnabled ? [{ href: "/rewards", icon: Gift, label: t.nav.rewards }] : []),
    ...(profileEnabled ? [{ href: "/profile", icon: User, label: t.nav.profile }] : []),
    ...(settings.petSystemEnabled ? [{ href: "/pet", icon: PawPrint, label: t.nav.pet }] : []),
    ...(settings.stickerSystemEnabled ? [{ href: "/stickers", icon: Sticker, label: t.nav.stickers }] : []),
    ...(settings.moodTrackingEnabled ? [{ href: "/mood", icon: Smile, label: t.nav.mood }] : []),
    { href: "/spiele", icon: Gamepad2, label: t.nav.games },
  ]

  const handleNavClick = () => {
    setOpenMobile(false)
  }

  if (!isLoaded) {
    return (
      <>
        <SidebarHeader className="border-b p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center animate-pulse" />
            {!isCollapsed && (
              <div className="flex flex-col gap-1">
                <div className="h-5 w-20 bg-muted rounded animate-pulse" />
                <div className="h-3 w-16 bg-muted rounded animate-pulse" />
              </div>
            )}
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <div className="space-y-2 p-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-muted rounded animate-pulse" />
              ))}
            </div>
          </SidebarGroup>
        </SidebarContent>
      </>
    )
  }

  return (
    <>
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <span className="text-xl">👨‍👩‍👧‍👦</span>
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-lg text-sidebar-foreground">FamiApp</span>
              <span className="text-xs text-muted-foreground">Family Routine</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {selectedChild && childrenArray.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Kind</SidebarGroupLabel>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    "flex items-center gap-3 w-full p-2 rounded-lg hover:bg-accent transition-colors",
                    isCollapsed && "justify-center",
                  )}
                >
                  <ChildAvatar avatar={selectedChild.avatar} color={selectedChild.color} size="sm" />
                  {!isCollapsed && (
                    <>
                      <div className="flex-1 text-left">
                        <div className="font-medium text-sidebar-foreground">{selectedChild.name}</div>
                        <div className="text-xs text-muted-foreground">{selectedChild.points} Punkte</div>
                      </div>
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {childrenArray.map((child) => (
                  <DropdownMenuItem
                    key={child.id}
                    onClick={() => dispatch({ type: "SELECT_CHILD", payload: child.id })}
                    className="flex items-center gap-3"
                  >
                    <ChildAvatar avatar={child.avatar} color={child.color} size="sm" />
                    <div className="flex-1">
                      <div className="font-medium text-foreground">{child.name}</div>
                      <div className="text-xs text-muted-foreground">{child.points} Punkte</div>
                    </div>
                    {child.id === selectedChild.id && <span className="text-primary">aktiv</span>}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarGroup>
        )}

        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarMenu>
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={isActive} tooltip={item.label} onClick={handleNavClick}>
                    <Link href={item.href}>
                      <item.icon className={cn("w-5 h-5", isActive && "text-primary")} />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-2 flex flex-col gap-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname.startsWith("/admin")}
              tooltip="Einstellungen"
              onClick={handleNavClick}
            >
              <Link href="/admin">
                <Settings className="w-5 h-5" />
                <span>Admin</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <AppVersionFooter />
      </SidebarFooter>
    </>
  )
}

function DashboardContent({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile()

  return (
    <SidebarInset>
      {/* Mobile Header */}
      {isMobile && (
        <header className="flex items-center gap-2 h-14 px-4 border-b bg-card/95 backdrop-blur-md sticky top-0 z-40">
          <SidebarTrigger />
          <span className="font-semibold text-foreground">FamiApp</span>
        </header>
      )}
      <main className={cn("flex-1 p-4", isMobile && "pb-20")}>{children}</main>
    </SidebarInset>
  )
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <Sidebar collapsible="offcanvas">
        <SidebarNavigation />
      </Sidebar>
      <DashboardContent>{children}</DashboardContent>
    </SidebarProvider>
  )
}
