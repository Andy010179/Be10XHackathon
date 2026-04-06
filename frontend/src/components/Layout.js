import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  LayoutDashboard, Users, GraduationCap, DollarSign,
  BookOpen, Menu, X, LogOut, ChevronRight, Building2,
  Users2, UserCog
} from "lucide-react";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "employer"] },
  { path: "/enquiries", label: "CRM Pipeline", icon: Users, roles: ["admin"] },
  { path: "/academic", label: "Academic", icon: BookOpen, roles: ["admin"] },
  { path: "/courses", label: "Courses", icon: GraduationCap, roles: ["admin"] },
  { path: "/finance", label: "Finance", icon: DollarSign, roles: ["admin"] },
  { path: "/students", label: "Students", icon: Users2, roles: ["admin"] },
  { path: "/users", label: "User Management", icon: UserCog, roles: ["admin"] },
  { path: "/portal", label: "My Portal", icon: LayoutDashboard, roles: ["student"] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const visibleNav = navItems.filter((item) =>
    item.roles.includes(user?.role)
  );

  const roleColors = {
    admin: "bg-[#002EB8] text-white",
    employer: "bg-[#00C853] text-white",
    teacher: "bg-[#FFD600] text-[#0A0A0A]",
    student: "bg-[#8A8F98] text-white",
  };

  return (
    <div className="flex min-h-screen bg-[#F8F9FA]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-[#E5E7EB] z-30 transform transition-transform duration-200 flex flex-col
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:static lg:z-auto`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-6 h-16 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#002EB8] rounded flex items-center justify-center">
              <Building2 size={16} className="text-white" />
            </div>
            <span className="font-cabinet font-bold text-[#0A0A0A] text-lg tracking-tight">
              EduTech LMS
            </span>
          </div>
          <button
            className="lg:hidden text-[#8A8F98] hover:text-[#0A0A0A]"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1">
          {visibleNav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-satoshi font-medium transition-all group
                ${isActive
                  ? "bg-[#002EB8] text-white"
                  : "text-[#8A8F98] hover:bg-[#F8F9FA] hover:text-[#0A0A0A]"
                }`
              }
              data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, "-")}`}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
              <ChevronRight size={14} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="border-t border-[#E5E7EB] p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-[#F8F9FA] border border-[#E5E7EB] rounded-full flex items-center justify-center font-bold text-[#002EB8] text-sm font-cabinet">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#0A0A0A] truncate font-satoshi">{user?.name}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-mono uppercase tracking-widest ${roleColors[user?.role] || "bg-gray-100 text-gray-600"}`}>
                {user?.role}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            data-testid="logout-button"
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[#8A8F98] hover:text-[#FF2B2B] hover:bg-red-50 rounded-md transition-colors font-satoshi"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header */}
        <header className="h-16 bg-white border-b border-[#E5E7EB] flex items-center px-4 lg:px-6 sticky top-0 z-10">
          <button
            className="lg:hidden mr-3 text-[#8A8F98] hover:text-[#0A0A0A]"
            onClick={() => setSidebarOpen(true)}
            data-testid="mobile-menu-button"
          >
            <Menu size={22} />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2 text-sm text-[#8A8F98] font-satoshi">
            <span>Welcome,</span>
            <span className="font-medium text-[#0A0A0A]">{user?.name}</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
