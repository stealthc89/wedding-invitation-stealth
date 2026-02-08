import PhotoSlideshow from "@/components/PhotoSlideshow";
import BackgroundMusic from "@/components/BackgroundMusic";

export default function Home() {
  return (
    <>
      <PhotoSlideshow overlay="dark">
        <div className="text-center px-6 py-20">
          <p className="text-sm uppercase tracking-[0.3em] text-white/70 mb-4">
            Together with their families
          </p>
          <h1 className="text-6xl md:text-7xl font-normal text-white mb-3">
            Chris & Candice
          </h1>
          <div className="w-16 h-px bg-white/40 mx-auto my-6" />
          <p className="text-lg text-white/80 mb-2">
            Request the pleasure of your company
          </p>
          <p className="text-sm text-white/60 mt-8">
            Please use your personal invitation link to RSVP
          </p>
        </div>
      </PhotoSlideshow>
      <BackgroundMusic src="/audio/its-you-max.mp3" volume={0.5} />
    </>
  );
}
