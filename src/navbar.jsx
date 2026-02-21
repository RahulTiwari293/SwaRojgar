import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { IoSearch } from 'react-icons/io5';
import logo from "./assets/logo.png";
import ExploreDropdown from './navbarComponents/ExploreDropdown';
import OrdersDropdown from './navbarComponents/OrderDropdown';
import WalletButton from './components/WalletButton';
import './navbar.css';

function Navbar() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [ordersDropdownOpen, setOrdersDropdownOpen] = useState(false);
  const [userType, setUserType] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const type = localStorage.getItem('userType');
    setUserType(type);
  }, [location]);

  const handleSearchClick = () => {
    navigate("/search");
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="navbar-container">
      <div className="navbar-content">
        {/* Logo with Background */}
        <div className="navbar-logo" onClick={() => navigate('/')}>
          <img src={logo} alt="SwaRojgar Logo" />
        </div>

        {/* Search Bar */}
        <div className="navbar-search">
          <input
            type="text"
            placeholder="Search what you need"
          />
          <button onClick={handleSearchClick}>
            <IoSearch className="text-xl" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="navbar-links">
          {/* Browse Jobs */}
          <button
            className={isActive('/') ? 'active' : ''}
            onClick={() => navigate('/')}
          >
            Browse Jobs
          </button>

          {/* Role-Based Navigation */}
          {userType === 'client' && (
            <button
              className={isActive('/customer-jobs') ? 'active' : ''}
              onClick={() => navigate('/customer-jobs')}
            >
              💼 My Jobs
            </button>
          )}

          {userType === 'freelancer' && (
            <>
              <button
                className={isActive('/freelancer-jobs') ? 'active' : ''}
                onClick={() => navigate('/freelancer-jobs')}
              >
                💼 My Jobs
              </button>
              <button
                className={isActive('/work-submission') ? 'active' : ''}
                onClick={() => navigate('/work-submission')}
              >
                📤 Submit Work
              </button>
            </>
          )}

          {/* Explore Dropdown */}
          <ExploreDropdown
            dropdownOpen={dropdownOpen}
            setDropdownOpen={setDropdownOpen}
          />

          {/* Orders Dropdown */}
          <OrdersDropdown
            ordersDropdownOpen={ordersDropdownOpen}
            setOrdersDropdownOpen={setOrdersDropdownOpen}
          />

          {/* Profile Button */}
          <button
            className={isActive('/profile') ? 'active' : ''}
            onClick={() => navigate("/profile")}
          >
            Profile
          </button>

          {/* Wallet Button */}
          <WalletButton />
        </div>
      </div>
    </div>
  );
}

export default Navbar;
