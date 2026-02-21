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

function RightbarClient() {
  return (
    <div className="rightbar w-1/4 h-1/2 rounded-xl drop-shadow-md bg-white">
      {/* Changed heading text to "Jobs Posted" */}
      <h1 className="font-bold text-3xl p-5">Jobs Posted</h1>
      <div className="courses flex flex-wrap justify-center items-center">
        {courses.map((course, index) => (
          <div key={index} className="mb-5">
            <div className="mb-2 bg-white rounded shadow-lg">
              <iframe
                className="rounded-xl"
                width="100%"
                height="200"
                src={`https://www.youtube.com/embed/${course.videoId}`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              ></iframe>
            </div>
            <div className="font-bold pb-5 p-2">{course.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RightbarClient;
