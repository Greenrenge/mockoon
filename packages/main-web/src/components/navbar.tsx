'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { PiIcon as Panda } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from './auth/auth-provider';
import { useUser } from './providers';

export function Navbar() {
  const { isAuthenticated, isLoading: authLoading, login, logout } = useAuth();
  const { user, roles, isLoading: userLoading } = useUser();

  const isLoading = authLoading || userLoading;

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <Panda className="h-8 w-8" />
            <span className="font-bold text-xl">PandaMock</span>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          {isLoading ? (
            <div className="h-10 w-20 bg-muted animate-pulse rounded" />
          ) : isAuthenticated ? (
            <>
              {roles.isTeamMember && (
                <Button asChild>
                  <Link href="/app">Launch App</Link>
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-10 w-10 rounded-full"
                  >
                    <Avatar>
                      {/* <AvatarImage
                        src="/placeholder.svg"
                        alt={user?.displayName || 'User'}
                      /> */}
                      <AvatarFallback>
                        {getInitials(user?.displayName)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>
                    <div className="font-medium">{user?.displayName}</div>
                    <div className="text-xs text-muted-foreground">
                      {user?.email}
                    </div>
                  </DropdownMenuLabel>

                  {roles.isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/admin">Admin Management</Link>
                      </DropdownMenuItem>
                    </>
                  )}

                  {(roles.isTeamOwner || roles.isAdmin) && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/team">Team Management</Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}

                  <DropdownMenuItem onClick={() => logout()}>
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button onClick={() => login()}>Login</Button>
          )}
        </div>
      </div>
    </nav>
  );
}
