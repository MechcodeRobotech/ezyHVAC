import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import LanguageToggle from "../contexts/LanguageToggle";
import { useLanguage } from "../contexts/LanguageContext";
import VisitorCounter from './VisitorCounter';
import Logo from '../../public/Logo_of_University_of_Phayao.svg.png';
import EzyPipeCal from './Ezypipe';

const Header = () => {
  const { lang } = useLanguage();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const text = {
    en: {
      title: "ezyHVAC ",
      desc: "HVAC Calculator tools",
      calculation: "Thailand",
      comparison: "Energy Comparison",
      upload: "Other Country",
      document: "Document",
      langBtn: "TH",
      cooling: "Cooling Load",
      tools: "Energy Calculation Tools",
      EzyPipeCal: "ezyPipeCal",
      imageCalculator: "Image Calculator"
    },
    th: {
      title: "ezyHVAC ",
      desc: "เครื่องมือคำนวณ HVAC",
      calculation: "คำนวณพลังงาน ประเทศไทย",
      comparison: "เปรียบเทียบพลังงาน ประเทศไทย",
      upload: "คำนวณพลังงาน ต่างประเทศ",
      document: "เอกสาร",
      langBtn: "EN",
      cooling: "คำนวณภาระความเย็น",
      tools: "เครื่องมือคำนวณพลังงาน",
      EzyPipeCal: "ezyPipeCal",
      imageCalculator: "คำนวณจากภาพ"
    }
  };

  return (
    <header className="bg-gray-50 shadow-md border-b border-gray-200 max-w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-between min-h-[100px]">
        <div>
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="flex-shrink-0 mr-4">
                <img
                  src={Logo}
                  alt="University of Phayao"
                  className="mt-2 w-16 h-16 object-contain transition-transform duration-300 hover:scale-105"
                />
              </div>
              <div>
                <h1 className="font-kanit text-2xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 to-purple-500 bg-clip-text text-transparent">
                  {text[lang].title}
                </h1>
                <p className="text-sm text-gray-700 font-semibold">
                  <hr className="my-1 border-gray-300" />
                  {text[lang].desc}
                </p>
              </div>
            </div>
            
            <div className='flex items-center space-x-3'>
              <VisitorCounter />
              <LanguageToggle />
            </div>
          </div>
        </div>
        
        <nav className="hidden md:flex space-x-4 text-sm mt-auto pt-2 items-center">

          <NavLink
            to="/Coolingload"
            className={({ isActive }) =>
              isActive
                ? "border-b-3 border-indigo-600 text-indigo-700 py-2 px-3 font-bold bg-indigo-50 transition-all duration-200 transform hover:scale-105"
                : "border-b-3 border-transparent text-gray-600 hover:text-indigo-700 hover:border-indigo-600 hover:bg-gray-100 py-2 px-3 font-semibold transition-all duration-200 transform hover:scale-105"
            }
          >
            {text[lang].cooling}
          </NavLink>

          <div 
            className="relative group"
            onMouseEnter={() => setIsDropdownOpen(true)}
            onMouseLeave={() => setIsDropdownOpen(false)}
          >
            <div
              className={`flex items-center py-1 px-3 font-semibold cursor-pointer transition-all duration-200 transform hover:scale-105  ${
                isDropdownOpen 
                  ? 'border-b-3 border-indigo-600 text-indigo-700 bg-indigo-50'
                  : 'border-b-3 border-transparent text-gray-600 hover:text-indigo-700 hover:border-indigo-600 hover:bg-gray-100'
              }`}
            >
              {text[lang].tools}
              <span className={`ml-2 transition-transform duration-300 ease-in-out ${isDropdownOpen ? 'rotate-180' : 'rotate-0'}`}>
                <ChevronDown size={16} />
              </span>
            </div>
            
            <div className={`absolute left-0 mt-2 w-56 bg-white  shadow-xl z-20  overflow-hidden transition-all duration-300 ease-out transform origin-top ${
              isDropdownOpen 
                ? 'opacity-100 scale-100 translate-y-0 visible' 
                : 'opacity-0 scale-95 -translate-y-2 invisible'
            }`}>
              
              
              <div className="bg-indigo-600 px-4 py-3">
                <p className="text-white font-bold text-sm flex items-center">
                  <span className=""></span>
                  {text[lang].tools}
                </p>
              </div>
              
              <div className="py-2">
                <NavLink
                  to="/Seercal"
                  className={({ isActive }) =>
                    `block px-4 py-3 text-sm transition-all duration-200 ease-in-out hover:bg-indigo-50 hover:text-indigo-700  group ${
                      isActive
                        ? "text-indigo-700 font-bold bg-indigo-50 border-r-4 "
                        : "text-gray-700"
                    }`
                  }
                >
                  <div className="flex items-center">
                    <span className=" transition-all duration-200 group-hover:bg-indigo-600"></span>
                    {text[lang].calculation}
                  </div>
                </NavLink>
                
                <NavLink
                  to="/compare"
                  className={({ isActive }) =>
                    `block px-4 py-3 text-sm transition-all duration-200 ease-in-out hover:bg-indigo-50 hover:text-indigo-700  group ${
                      isActive
                        ? "text-indigo-700 font-bold bg-indigo-50 border-r-4 border-indigo-600"
                        : "text-gray-700"
                    }`
                  }
                >
                  <div className="flex items-center">
                    <span className="transition-all duration-200 group-hover:bg-blue-600"></span>
                    {text[lang].comparison}
                  </div>
                </NavLink>
                
                <NavLink
                  to="/upload"
                  className={({ isActive }) =>
                    `block px-4 py-3 text-sm transition-all duration-200 ease-in-out hover:bg-indigo-50 hover:text-indigo-700 group ${
                      isActive
                        ? "text-indigo-700 font-bold bg-indigo-50 border-r-4 border-indigo-600"
                        : "text-gray-700"
                    }`
                  }
                >
                  <div className="flex items-center">
                    <span className="transition-all duration-200 group-hover:bg-gray-600"></span>
                    {text[lang].upload}
                  </div>
                </NavLink>
              </div>
              <div className="h-1 bg-gradient-to-r from-indigo-500 to-blue-500"></div>
            </div>
          </div>
          <NavLink
            to="/Pipecal"
            className={({ isActive }) =>
              isActive
                ? "border-b-3 border-indigo-600 text-indigo-700 py-2 px-3 font-bold bg-indigo-50 transition-all duration-200 transform hover:scale-105"
                : "border-b-3 border-transparent text-gray-600 hover:text-indigo-700 hover:border-indigo-600 hover:bg-gray-100 py-2 px-3 font-semibold transition-all duration-200 transform hover:scale-105"
            }
          >
            {text[lang].EzyPipeCal}
          </NavLink>

          <NavLink
            to="/ImageCalculator"
            className={({ isActive }) =>
              isActive
                ? "border-b-3 border-indigo-600 text-indigo-700 py-2 px-3 font-bold bg-indigo-50 transition-all duration-200 transform hover:scale-105"
                : "border-b-3 border-transparent text-gray-600 hover:text-indigo-700 hover:border-indigo-600 hover:bg-gray-100 py-2 px-3 font-semibold transition-all duration-200 transform hover:scale-105"
            }
          >
            {text[lang].imageCalculator}
          </NavLink>

          <NavLink
            to="/document"
            className={({ isActive }) =>
              isActive
                ? "border-b-3 border-indigo-600 text-indigo-700 py-2 px-3 font-bold bg-indigo-50 transition-all duration-200 transform hover:scale-105"
                : "border-b-3 border-transparent text-gray-600 hover:text-indigo-700 hover:border-indigo-600 hover:bg-gray-100 py-2 px-3 font-semibold transition-all duration-200 transform hover:scale-105"
            }
          >
            {text[lang].document}
          </NavLink>
        
        </nav>
      </div>
    </header>
  );
};

export default Header;