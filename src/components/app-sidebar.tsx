'use client'

import {
  IconBook,
  IconBrandGithub,
  IconBrandStackshare,
  IconChartBar,
  IconCircle,
  IconExternalLink,
  IconFileWord,
  IconRadar,
  IconRocket,
  IconTools,
} from '@tabler/icons-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as React from 'react'

import { NavUser } from '@/components/nav-user'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

const data = {
  groups: [
    {
      label: 'Create',
      items: [
        {
          label: 'Templates Library',
          url: `${process.env.NEXT_PUBLIC_APP_ROOT}/templates`,
          icon: IconFileWord,
        },
        {
          label: 'Agent Builder',
          url: '/',
          icon: IconBrandStackshare,
        },
        {
          label: 'Tools Library',
          url: `${process.env.NEXT_PUBLIC_APP_ROOT}/tools-library`,
          icon: IconTools,
        },
      ],
    },
    {
      label: 'Manage',
      hideOnCollapse: true,
      items: [
        {
          label: 'Deployments',
          url: `${process.env.NEXT_PUBLIC_APP_ROOT}/deployments`,
          icon: IconRocket,
        },
        {
          label: 'Traces',
          url: `${process.env.NEXT_PUBLIC_APP_ROOT}/traces`,
          icon: IconRadar,
        },
        {
          label: 'Metrics',
          url: `${process.env.NEXT_PUBLIC_APP_ROOT}/metrics`,
          icon: IconChartBar,
        },
        {
          label: 'Benchmark',
          url: `${process.env.NEXT_PUBLIC_APP_ROOT}/benchmark`,
          icon: IconCircle,
        },
      ],
    },
  ],
}

const links = [
  {
    label: 'Langcrew',
    url: 'https://github.com/01-ai/langcrew',
    icon: IconBrandGithub,
  },
  {
    label: 'Docs',
    url: 'https://langcrew.ai/',
    icon: IconBook,
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="/">
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-sm bg-emerald-600 text-white flex items-center justify-center">
                    <IconBrandStackshare className="!size-4" />
                  </div>
                  <span className="text-base font-semibold">
                    Open Agent Kit
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {data.groups.map((group) => (
          <SidebarGroup
            key={group.label}
            className={
              group.hideOnCollapse
                ? 'group-data-[collapsible=icon]:hidden'
                : undefined
            }
          >
            {/* <SidebarGroupLabel>{group.label}</SidebarGroupLabel> */}
            <SidebarGroupContent
              className={
                group.label === 'Create' ? 'flex flex-col gap-2' : undefined
              }
            >
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.label}
                      isActive={pathname === item.url}
                    >
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                {links.map((link) => (
                  <SidebarMenuButton
                    key={link.label}
                    tooltip={link.label}
                    asChild
                  >
                    <Link
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <link.icon />
                      <span>{link.label}</span>
                      <IconExternalLink className="ml-auto !size-4" />
                    </Link>
                  </SidebarMenuButton>
                ))}
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
