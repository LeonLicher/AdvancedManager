import React from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
    NavigationMenu,
    NavigationMenuItem,
    NavigationMenuList,
} from '../components/ui/navigation-menu'
import { cn } from '../lib/utils'

const NavBar: React.FC = () => {
    const navigate = useNavigate()
    const location = useLocation()

    const navButtonClass = `w-32 px-4 py-2 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground`

    const mobileNavItems = [
        // { path: '/matchday', icon: 'bi-calendar-event-fill', label: 'Live' },
        // { path: '/activity', icon: 'bi-activity', label: 'Activity' },
        // { path: '/market', icon: 'bi-shop', label: 'Market'},
        { path: '/team', icon: 'bi-people', label: 'Team' },
        // { path: '/authlogs', icon: 'bi-shield-lock', label: 'Auth'},
        { path: '/available', icon: 'bi-person-plus', label: 'Spieleranalyse' },
        // { path: '/team-analyzer', icon: 'bi-star', label: 'Teambewertung' },
        { path: '/compare', icon: 'bi-arrow-left-right', label: 'Vergleich' },
        { path: '/overpay', icon: 'bi-cash-coin', label: 'Overpay' },
        { path: '/calculator', icon: 'bi-calculator', label: 'Calculator' },
    ]

    return (
        <div className="min-h-screen flex flex-col">
            {/* Desktop Navigation */}
            <div className="border-b px-4 py-2 fixed top-0 w-full bg-background z-50 hidden md:block">
                <div className="max-w-7xl mx-auto">
                    <NavigationMenu className="mx-auto">
                        <NavigationMenuList className="gap-2">
                            {/* <NavigationMenuItem>
                <button
                  onClick={() => navigate('/matchday')}
                  className={`${navButtonClass} ${
                    location.pathname === '/matchday' ? 'bg-accent text-accent-foreground' : ''
                  }`}
                >
                  Live Matchday
                </button>
              </NavigationMenuItem> */}

                            {
                                <>
                                    {/* <NavigationMenuItem>
                    <button
                      onClick={() => navigate('/activity')}
                      className={`${navButtonClass} ${
                        location.pathname === '/activity' ? 'bg-accent text-accent-foreground' : ''
                      }`}
                    >
                      Activity Feed
                    </button>
                  </NavigationMenuItem> */}

                                    {/* <NavigationMenuItem>
                    <button
                      onClick={() => navigate('/market')}
                      className={`${navButtonClass} ${
                        location.pathname === '/market' ? 'bg-accent text-accent-foreground' : ''
                      }`}
                    >
                      Player Market
                    </button>
                  </NavigationMenuItem> */}

                                    <NavigationMenuItem>
                                        <button
                                            onClick={() => navigate('/team')}
                                            className={`${navButtonClass} ${
                                                location.pathname === '/team'
                                                    ? 'bg-accent text-accent-foreground'
                                                    : ''
                                            }`}
                                        >
                                            Team Management
                                        </button>
                                    </NavigationMenuItem>

                                    {/* <NavigationMenuItem>
                    <button
                      onClick={() => navigate('/authlogs')}
                      className={`${navButtonClass} ${
                        location.pathname === '/authlogs' ? 'bg-accent text-accent-foreground' : ''
                      }`}
                    >
                      Auth Logs
                    </button>
                  </NavigationMenuItem> */}

                                    <NavigationMenuItem>
                                        <button
                                            onClick={() =>
                                                navigate('/available')
                                            }
                                            className={`${navButtonClass} ${
                                                location.pathname ===
                                                '/available'
                                                    ? 'bg-accent text-accent-foreground'
                                                    : ''
                                            }`}
                                        >
                                            Spieleranalyse
                                        </button>
                                    </NavigationMenuItem>

                                    {/* <NavigationMenuItem>
                                        <button
                                            onClick={() =>
                                                navigate('/team-analyzer')
                                            }
                                            className={`${navButtonClass} ${
                                                location.pathname ===
                                                '/team-analyzer'
                                                    ? 'bg-accent text-accent-foreground'
                                                    : ''
                                            }`}
                                        >
                                            Teambewertung
                                        </button>
                                    </NavigationMenuItem> */}

                                    <NavigationMenuItem>
                                        <button
                                            onClick={() => navigate('/compare')}
                                            className={`${navButtonClass} ${
                                                location.pathname === '/compare'
                                                    ? 'bg-accent text-accent-foreground'
                                                    : ''
                                            }`}
                                        >
                                            Spielervergleich
                                        </button>
                                    </NavigationMenuItem>

                                    <NavigationMenuItem>
                                        <button
                                            onClick={() => navigate('/overpay')}
                                            className={`${navButtonClass} ${
                                                location.pathname === '/overpay'
                                                    ? 'bg-accent text-accent-foreground'
                                                    : ''
                                            }`}
                                        >
                                            Overpay
                                        </button>
                                    </NavigationMenuItem>

                                    <NavigationMenuItem>
                                        <button
                                            onClick={() =>
                                                navigate('/calculator')
                                            }
                                            className={`${navButtonClass} ${
                                                location.pathname ===
                                                '/calculator'
                                                    ? 'bg-accent text-accent-foreground'
                                                    : ''
                                            }`}
                                        >
                                            Calculator
                                        </button>
                                    </NavigationMenuItem>
                                </>
                            }
                        </NavigationMenuList>
                    </NavigationMenu>
                </div>
            </div>

            {/* Mobile Bottom Navigation */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t z-50">
                <div className="flex justify-between p-2">
                    {mobileNavItems.map((item) => (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            className={cn(
                                'flex flex-col items-center justify-center p-0.5 rounded-lg flex-1',
                                'text-xs gap-0.2 transition-colors',
                                location.pathname === item.path
                                    ? 'bg-accent text-accent-foreground'
                                    : 'hover:bg-accent/50'
                            )}
                        >
                            <i className={`${item.icon} text-lg`}></i>
                            <span>{item.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 md:mt-16 mb-16 md:mb-4 p-4">
                <Outlet />
            </main>
        </div>
    )
}

export default NavBar
