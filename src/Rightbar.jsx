// Rightbar.js
import React from "react";

// Inline courses data (previously imported from courses.js)
const courses = [
  { id: 1, videoId: "-ETQ97mXXF0", name: "Data Science" },
  { id: 2, videoId: "GwIo3gDZCVQ", name: "ML" },
  { id: 3, videoId: "YLpCPo0FDtE", name: "Web Dev" },
  { id: 4, videoId: "BU_afT-aIn0", name: "UI/UX" },
  { id: 5, videoId: "qDHnCFMZ9HA", name: "Davinci Resolve" },
  { id: 6, videoId: "JMUxmLyrhSk", name: "AI" },
  { id: 7, videoId: "lpa8uy4DyMo", name: "Cloud Computing" }
];

function Rightbar() {
  return (
    <div className="rightbar w-full p-6 rounded-xl shadow-lg bg-white border border-gray-200">
      <h1 className="font-bold text-xl mb-5">Upskill Yourself</h1>
      <div className="courses flex flex-col gap-4">
        {courses.map((course, index) => (
          <div key={index} className="course-item">
            <div className="mb-2 bg-white rounded-lg shadow-md overflow-hidden border border-gray-100">
              <iframe
                className="w-full"
                height="180"
                src={`https://www.youtube.com/embed/${course.videoId}`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              ></iframe>
            </div>
            <div className="font-semibold text-sm text-gray-800 px-1">{course.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Rightbar;
