"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"

const navigation = [
    { name: "Dashboard", href: "#Dashboard" },
    { name: "Collection", href: "#Collection" },
    { name: "Inventory", href: "#Inventory" },
    { name: "Appointment", href: "#Appointment" },
    { name: "Users", href: "#Users" },
  { name: "Profile", href: "#profile" },
]

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeLink, setActiveLink] = useState<string | null>(null)

  const handleClick = (href: string) => {
    setActiveLink(href)
    setMobileMenuOpen(false)
  }

  return (
    <nav className="sticky top-0 z-50 bg-white shadow-lg mb-1 opacity-90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <span className="text-2xl font-bold text-[#113F67]">BIOCELLA</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex flex-1 justify-center items-center space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => handleClick(item.href)}
                className={`relative px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                  activeLink === item.href
                    ? "text-[#113F67] font-semibold underline underline-offset-4"
                    : "text-[#113F67] hover:text-[#113F67]/70"
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none"
            >
              <span className="sr-only">Toggle Menu</span>
              {mobileMenuOpen ? (
                <X className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden px-4 pt-2 pb-4 bg-white border-t border-gray-200">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => handleClick(item.href)}
              className={`block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200 ${
                activeLink === item.href
                  ? "text-white bg-[#113F67]"
                  : "text-[#113F67] hover:bg-[#113F67] hover:text-white"
              }`}
            >
              {item.name}
            </Link>
          ))}
        </div>
      )}
    </nav>
  )
}
