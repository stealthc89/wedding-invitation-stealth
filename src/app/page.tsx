import PhotoSlideshow from "@/components/PhotoSlideshow";
import BackgroundMusic from "@/components/BackgroundMusic";

export default function Home() {
  return (
    <>
      <PhotoSlideshow overlay="dark">
        <div className="text-center px-4 sm:px-6 py-12 sm:py-20 max-w-4xl mx-auto">
          <p className="text-xs sm:text-sm uppercase tracking-[0.25em] sm:tracking-[0.3em] text-white/70 mb-3 sm:mb-4">
            Together with their families
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-normal text-white mb-2 sm:mb-3 leading-tight">
            Chris & Candice
          </h1>
          <div className="w-12 sm:w-16 h-px bg-white/40 mx-auto my-4 sm:my-6" />
          <p className="text-base sm:text-lg md:text-xl text-white/80 mb-2 px-4">
            Request the pleasure of your company
          </p>
          <p className="text-xs sm:text-sm text-white/60 mt-6 sm:mt-8 px-4">
            Please use your personal invitation link to RSVP
          </p>
        </div>
      </PhotoSlideshow>
      <BackgroundMusic src="/audio/its-you-max.mp3" volume={0.7} startTime={0} />
    </>
  );
}
