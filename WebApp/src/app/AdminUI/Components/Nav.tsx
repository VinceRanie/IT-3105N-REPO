"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"
import Image from "next/image"

const navigation = [
  { name: "Dashboard", href: "#dashboard" },
  { name: "Collection", href: "#collection" },
  { name: "Inventory", href: "#inventory" },
  { name: "Appointment", href: "#appointment" },
  { name: "Users", href: "#users" },
  { name: "Profile", href: "#profile" },
]

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeHash, setActiveHash] = useState("#dashboard")

  const handleNavClick = (hash: string) => {
    setActiveHash(hash)
    setMobileMenuOpen(false) // close mobile menu when clicked
  }

  return (
    <nav className="sticky top-0 z-50 bg-white shadow-lg mb-1 opacity-90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 flex-shrink-0">
            <Image
              src="/UI/img/BiocellaLogo.png"
              alt="Scientific laboratory research"
              className="w-10 h-10 rounded-tl-2xl rounded-bl-2xl object-cover"
              width={40}
              height={40}
            />
            <span className="text-2xl font-bold text-gray-800">BIOCELLA</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => handleNavClick(item.href)}
                className={`relative px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                  activeHash === item.href
                    ? "text-[#113F67] font-semibold"
                    : "text-[#113F67] hover:text-[#113F67]/70"
                }`}
              >
                {item.name}
                {activeHash === item.href && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#113F67] rounded-full"></span>
                )}
              </Link>
            ))}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-[#113F67] hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#113F67]"
            >
              <span className="sr-only cursor-pointer">Toggle Menu</span>
              {mobileMenuOpen ? (
                <X className="block h-6 w-6 text-[#113F67] cursor-pointer" aria-hidden="true" />
              ) : (
                <Menu className="block h-6 w-6 text-[#113F67] cursor-pointer" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden px-2 pt-2 pb-3 bg-white border-t border-gray-200 cursor-pointer">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => handleNavClick(item.href)}
              className={`block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200 cursor-pointer ${
                activeHash === item.href
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
