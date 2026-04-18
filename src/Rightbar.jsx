import React from "react";

const courses = [
  { id: 1, videoId: "-ETQ97mXXF0", name: "Data Science" },
  { id: 2, videoId: "GwIo3gDZCVQ", name: "Machine Learning" },
  { id: 3, videoId: "YLpCPo0FDtE", name: "Web Development" },
  { id: 4, videoId: "BU_afT-aIn0", name: "UI/UX Design" },
  { id: 5, videoId: "qDHnCFMZ9HA", name: "Davinci Resolve" },
  { id: 6, videoId: "JMUxmLyrhSk", name: "AI & Automation" },
  { id: 7, videoId: "lpa8uy4DyMo", name: "Cloud Computing" },
];

function Rightbar() {
  return (
    <div className="w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-5">
      <h1 className="font-bold text-sm text-gray-900 dark:text-white mb-4">Upskill Yourself</h1>
      <div className="flex flex-col gap-4">
        {courses.map((course) => (
          <div key={course.id}>
            <div className="rounded-xl overflow-hidden border border-gray-100 dark:border-white/8 mb-1.5">
              <iframe
                className="w-full"
                height="160"
                src={`https://www.youtube.com/embed/${course.videoId}`}
                title={course.name}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
            <p className="font-semibold text-xs text-gray-700 dark:text-white/60">{course.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Rightbar;
