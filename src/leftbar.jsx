import React from "react";
import { MdDesignServices, MdOutlineDesignServices, MdOutlineOndemandVideo } from "react-icons/md";
import { CgWebsite } from "react-icons/cg";
import { PiCookingPot } from "react-icons/pi";
import { RiSteering2Fill } from "react-icons/ri";
import { FaShower } from "react-icons/fa";
import { SiMarketo } from "react-icons/si";
import { IoMdStar } from "react-icons/io";

const CATEGORIES = [
  {
    title: "Trending Gigs",
    items: [
      { icon: MdOutlineOndemandVideo, label: "Video Editing" },
      { icon: MdOutlineDesignServices, label: "Graphic Design" },
      { icon: CgWebsite, label: "Web Dev" },
    ],
  },
  {
    title: "Local Gigs",
    items: [
      { icon: PiCookingPot, label: "Cooking" },
      { icon: RiSteering2Fill, label: "Driving" },
      { icon: FaShower, label: "Plumber" },
    ],
  },
  {
    title: "Professional Gigs",
    items: [
      { icon: CgWebsite, label: "Web Dev" },
      { icon: MdDesignServices, label: "Logo Design" },
      { icon: SiMarketo, label: "Social Media" },
    ],
  },
];

function Leftbar() {
  return (
    <div className="flex flex-col w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-5 space-y-6">
      {CATEGORIES.map((cat) => (
        <div key={cat.title}>
          <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            {cat.title}
            {cat.title === "Trending Gigs" && <IoMdStar className="text-gray-400 dark:text-white/30" />}
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {cat.items.map(({ icon: Icon, label }) => (
              <button key={label}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-gray-100 dark:border-white/8 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 hover:border-gray-300 dark:hover:border-white/20 transition-all group">
                <Icon className="text-2xl text-gray-400 dark:text-white/40 group-hover:text-gray-600 dark:group-hover:text-white/70 transition-colors" />
                <span className="text-xs font-medium text-gray-600 dark:text-white/50 group-hover:text-gray-800 dark:group-hover:text-white/80 transition-colors text-center leading-tight">
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default Leftbar;
