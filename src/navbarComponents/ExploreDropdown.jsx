import React, { useState } from "react";

// Inline gigs data (previously imported from gigs.js)
const TrendingGigs = [
  { id: 1, name: 'Video Editing', tagName: 'MdOutlineOndemandVideo' },
  { id: 2, name: 'Graphic Design', tagName: 'MdOutlineDesignServices' },
  { id: 3, name: 'Web Dev', tagName: 'CgWebsite' },
  { id: 4, name: 'Logo Design', tagName: 'CgWebsite' },
  { id: 5, name: 'SEO', tagName: 'CgWebsite' },
  { id: 6, name: 'Social Media Manager', tagName: 'CgWebsite' },
  { id: 7, name: 'AI specialist', tagName: 'CgWebsite' },
];

const LocalGigs = [
  { id: 1, name: "Plumber", description: "Fix and maintain plumbing systems.", location: "New York, NY", coordinates: { lat: 40.712776, lng: -74.005974 } },
  { id: 2, name: "Driver", description: "Professional driving services for local transportation.", location: "Los Angeles, CA", coordinates: { lat: 34.052235, lng: -118.243683 } },
  { id: 3, name: "Carpenter", description: "Carpentry services for furniture and fixtures.", location: "Chicago, IL", coordinates: { lat: 41.878113, lng: -87.629799 } },
  { id: 4, name: "Cook", description: "Prepare meals for events or daily cooking.", location: "Houston, TX", coordinates: { lat: 29.760427, lng: -95.369804 } },
  { id: 5, name: "Electrician", description: "Install and repair electrical systems.", location: "Miami, FL", coordinates: { lat: 25.761680, lng: -80.191790 } },
  { id: 6, name: "Gardener", description: "Maintain gardens and lawns.", location: "San Francisco, CA", coordinates: { lat: 37.774929, lng: -122.419418 } },
  { id: 7, name: "House Cleaner", description: "Professional cleaning services for homes.", location: "Boston, MA", coordinates: { lat: 42.360081, lng: -71.058884 } },
  { id: 8, name: "Painter", description: "Painting services for homes and offices.", location: "Seattle, WA", coordinates: { lat: 47.606209, lng: -122.332069 } },
];

function ExploreDropdown({ dropdownOpen, setDropdownOpen }) {
  const [trendingGigsToShow, setTrendingGigsToShow] = useState(3); // State to manage how many trending gigs to show
  const [localGigsToShow, setLocalGigsToShow] = useState(3); // State to manage how many local gigs to show

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  const seeMoreTrending = () => {
    setTrendingGigsToShow(trendingGigsToShow + 3); // Show 3 more trending gigs each time "see more" is clicked
  };

  const seeMoreLocal = () => {
    setLocalGigsToShow(localGigsToShow + 3); // Show 3 more local gigs each time "see more" is clicked
  };

  const handleLinkClick = (e) => {
    e.preventDefault(); // Prevent default action to avoid navigating away
  };

  return (
    <div className="relative">
      <button
        className="hover:text-purple-400 transition-colors"
        onClick={toggleDropdown}
      >
        Explore
      </button>
      <div
        className={`absolute top-full right-0 mt-2 w-60 bg-white border border-gray-300 rounded-lg shadow-lg z-50 transition-transform duration-300 ease-in-out ${dropdownOpen ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
          }`}
        style={{
          transformOrigin: "top right", // Set origin for a smooth dropdown animation
          transition: "opacity 0.3s ease, transform 0.3s ease",
        }}
      >
        <div className="p-4">
          <h4 className="text-lg font-semibold mb-2">Professional Jobs</h4>
          <ul className="space-y-2">
            {/* Render the first 'trendingGigsToShow' gigs from TrendingGigs */}
            {TrendingGigs.slice(0, trendingGigsToShow).map((gig, index) => (
              <li key={index}>
                <a href="#" className="block hover:bg-gray-100 p-2 rounded-md" onClick={handleLinkClick}>
                  {gig.name}
                </a>
              </li>
            ))}
          </ul>

          {/* Show 'see more' button only if there are more gigs to display */}
          {trendingGigsToShow < TrendingGigs.length && (
            <button
              className="text-sm pt-2 text-blue-500 hover:underline"
              onClick={seeMoreTrending}
            >
              see more
            </button>
          )}
        </div>
        <div className="border-t border-gray-300">
          <div className="p-4">
            <h4 className="text-lg font-semibold mb-2">Local Jobs</h4>
            <ul className="space-y-2">
              {/* Render the first 'localGigsToShow' gigs from LocalGigs */}
              {LocalGigs.slice(0, localGigsToShow).map((gig, index) => (
                <li key={index}>
                  <a href="#" className="block hover:bg-gray-100 p-2 rounded-md" onClick={handleLinkClick}>
                    {gig.name}
                  </a>
                </li>
              ))}
            </ul>

            {/* Show 'see more' button only if there are more local gigs to display */}
            {localGigsToShow < LocalGigs.length && (
              <button
                className="text-sm pt-2 text-blue-500 hover:underline"
                onClick={seeMoreLocal}
              >
                see more
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExploreDropdown;
