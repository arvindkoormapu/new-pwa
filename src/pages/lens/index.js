import { useState, useEffect, useRef, useMemo } from "react";
import { useMediaQuery, IconButton, Typography } from "@mui/material";
import { useRouter } from "next/router";
import Container from "@mui/material/Container";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Autoplay } from "swiper/modules";
import { useInfiniteQuery } from "@tanstack/react-query";
import axios from "axios";
import FavoriteIcon from "@mui/icons-material/Favorite";
import TextsmsIcon from "@mui/icons-material/Textsms";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import Image from "next/image";
import "swiper/css";
import "swiper/css/pagination";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import { WhatsappShareButton } from "next-share";
import ShareIcon from "@mui/icons-material/Share";
const fetchShortsData = async ({ pageParam = 0, queryKey }) => {
  const login_user_id = queryKey[1];
  const savedNewsfeeds = queryKey[2];

  const response = await axios.post(
    `https://api-dev.politikos.cloud/lens/listing`,
    {
      login_user_id: login_user_id,
      news_feed_lang_ids: savedNewsfeeds,
      page: pageParam,
      pageSize: 2,
    }
  );

  if (response.status !== 200) {
    throw new Error("Failed to fetch data");
  }

  return response.data;
};

const AudioPlayer = ({ audioUrl, isActive, isAudioMuted }) => {
  const audioElement = useRef(null);

  const handleAudioPlayback = (audio, isMuted) => {
    if (audio) {
      audio.muted = isMuted;
      audio
        .play()
        .then(() => {
          console.log("Audio playing");
        })
        .catch((err) => {
          console.error("Error playing audio:", err);
        });
    }
  };

  useEffect(() => {
    const audio = audioElement.current;
    if (audio) {
      if (audioUrl && isActive) {
        audio.src = audioUrl;
        handleAudioPlayback(audio, isAudioMuted);
      } else {
        audio.pause();
        audio.currentTime = 0;
      }
    }
  }, [audioUrl, isActive, isAudioMuted]);

  return (
    <audio ref={audioElement} controls style={{ display: "none" }}>
      {audioUrl && <source src={audioUrl} type="audio/mp4" />}
      Your browser does not support the audio element.
    </audio>
  );
};

const Lens = () => {
  const startY = useRef(null);
  const timerRef = useRef(null);
  const videoRef = useRef([]);
  const previousShortId = useRef(null);
  const firstBoxRef = useRef(null);
  const otpRes = { user_id: 222 };

  const isMobile = useMediaQuery("(max-width:454px)");
  const router = useRouter();

  const [currentAudio, setCurrentAudio] = useState(null);
  const [currentShortIndex, setCurrentShortIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isAudioMuted, setIsAudioMuted] = useState(true);
  const [chatAction, setChatAction] = useState(false);
  const [marginTop, setMarginTop] = useState(0);
  const [showShareAction, setShowShareAction] = useState(false);
  const [moreAction, setMoreAction] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [likeStatus, setLikeStatus] = useState(false);
  const [playedTime, setPlayedTime] = useState(0);
  const [viewCountSent, setViewCountSent] = useState(false);
  const [dragDistance, setDragDistance] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      // Prevent pull-to-refresh reload
      window.addEventListener(
        "touchmove",
        (e) => {
          if (e.touches[0].clientY > 0 && window.scrollY === 0) {
            e.preventDefault();
          }
        },
        { passive: false }
      );
    }
  }, []);

  const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ["shorts", otpRes?.user_id, [60]],
    queryFn: fetchShortsData,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextpagenumber : false,
  });

  const allShorts = useMemo(
    () => data?.pages.flatMap((page) => page.data) || [],
    [data]
  );
  const currentShort = allShorts[currentShortIndex];

  useEffect(() => {
    // Preload the next video when the current one is active
    const preloadNextVideo = () => {
      if (currentShortIndex < allShorts.length - 1) {
        const nextVideo =
          allShorts[currentShortIndex + 1]?.video_details?.file_url;
        if (nextVideo) {
          const videoElement = document.createElement("video");
          videoElement.src = nextVideo;
          videoElement.preload = "auto";
        }
      }
    };

    preloadNextVideo();
  }, [currentShortIndex, allShorts]);

  const preloadVideo = (video) => {
    if (video) {
      video.preload = "auto";
      video.load();
    }
  };

  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: "100px", // Start loading 200px before the video enters the viewport
      threshold: 0.1,
    };

    const observerCallback = (entries) => {
      entries.forEach((entry) => {
        const videoIndex = parseInt(entry.target.dataset.index, 10);
        if (entry.isIntersecting && videoRef.current[videoIndex]) {
          preloadVideo(videoRef.current[videoIndex]);
        }
      });
    };

    const observer = new IntersectionObserver(
      observerCallback,
      observerOptions
    );

    videoRef.current.forEach((video, index) => {
      if (video) {
        video.dataset.index = index;
        observer.observe(video);
      }
    });

    return () => {
      videoRef.current.forEach((video) => observer.unobserve(video));
    };
  }, []);

  useEffect(() => {
    if (currentShort) {
      setLikeStatus(currentShort.is_user_like);
      setIsBookmarked(currentShort.is_bookmarked);
    }
    if (currentShort && firstBoxRef.current) {
      setMarginTop(firstBoxRef.current.offsetHeight);
    }
  }, [currentShort]);

  const sendViewCount = () => {
    if (!viewCountSent) {
      setViewCountSent(true);
    }
  };

  const handleInteraction = () => {
    if (!viewCountSent && !timerRef.current) {
      timerRef.current = setTimeout(() => {
        setPlayedTime(5);
      }, 5000);
    }
  };

  const stopInteraction = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    if (playedTime >= 5 && !viewCountSent) {
      sendViewCount();
      stopInteraction();
    }
  }, [playedTime, viewCountSent]);

  useEffect(() => {
    setPlayedTime(0);
    setViewCountSent(false);
    stopInteraction();
    if (currentShort) handleInteraction();
    return () => stopInteraction();
  }, [currentShort]);

  useEffect(() => {
    if (currentShort && currentShort.lens_id !== previousShortId.current) {
      previousShortId.current = currentShort.lens_id;
      currentAudio?.pause();
      if (currentShort.audio_url) {
        const audio = new Audio(currentShort.audio_url);
        setCurrentAudio(audio);
        return () => audio.pause();
      }
    }
  }, [currentShort, isAudioMuted, currentAudio]);

  useEffect(() => {
    document
      .querySelectorAll("audio")
      .forEach((audio) => (audio.muted = isAudioMuted));
    if (currentAudio) currentAudio.muted = isAudioMuted;
  }, [isAudioMuted, currentAudio]);

  const handleUpArrowClick = () => {
    const previousIndex = currentShortIndex - 1;
    if (previousIndex >= 0) {
      setDragDistance(window.innerHeight);
      setTimeout(() => {
        setCurrentShortIndex(previousIndex);
        setDragDistance(0);
      }, 500);
    }
  };

  const handleDownArrowClick = () => {
    const nextIndex = currentShortIndex + 1;
    if (nextIndex < allShorts.length) {
      setDragDistance(-window.innerHeight);
      setTimeout(() => {
        setCurrentShortIndex(nextIndex);
        setDragDistance(0);
      }, 500);
    }
    if (nextIndex >= allShorts.length - 2 && hasNextPage) {
      fetchNextPage();
    }
  };

  const handleTouchStart = (e) => {
    startY.current = e.touches[0].clientY;
    setDragDistance(0);
  };

  const handleTouchMove = (e) => {
    if (!startY.current) return;
    const currentY = e.touches[0].clientY;
    const diff = startY.current - currentY;
    setDragDistance(
      Math.abs(diff) <= window.innerHeight ? -diff : Math.abs(diff)
    );
  };

  const handleTouchEnd = () => {
    const nextIndex = currentShortIndex + 1;
    const prevIndex = currentShortIndex - 1;
    if (
      dragDistance < -window.innerHeight * 0.1 &&
      nextIndex < allShorts.length
    ) {
      setCurrentShortIndex(nextIndex);
    } else if (dragDistance > window.innerHeight * 0.1 && prevIndex >= 0) {
      setCurrentShortIndex(prevIndex);
    }
    if (nextIndex >= allShorts.length - 2 && hasNextPage) fetchNextPage();
    setDragDistance(0);
    startY.current = null;
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      isPlaying ? videoRef.current.pause() : videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const handleAudioMuteUnmute = () => setIsAudioMuted(!isAudioMuted);

  const handleLike = async (lens_id) => {};

  const handleBlock = async () => {};

  const renderIcons = () => {
    const isVideo = !!currentShort?.video_details;
    const iconButtonStyles = {
      padding: "12px",
      color: "#fff",
      display: "flex",
      flexDirection: isVideo ? "column" : "row",
      justifyContent: isVideo ? "flex-end" : "center",
      position: "absolute",
      bottom: isVideo ? "116px" : "65px",
      right: isVideo ? "0px" : "auto",
      left: isVideo ? "auto" : "50%",
      transform: isVideo ? "none" : "translateX(-50%)",
      gap: "6px",
      maxWidth: isMobile ? "100%" : "454px",
      zIndex: 1,
    };

    const plainTextTitle = currentShort?.is_video
      ? currentShort?.video_details.title
      : currentShort?.images_details?.[0]?.title;
    const storyTitle = ``;

    return (
      <>
        {!isMobile && (
          <div
            style={{
              position: "absolute",
              top: "40px",
              right: 0,
              display: "flex",
              flexDirection: "column",
              padding: "0px 14px",
              gap: "14px",
              zIndex: 1,
            }}
          >
            <IconButton
              aria-label="arrow up"
              style={{
                background: currentShortIndex !== 0 ? "#D9D9D9" : "#d9d9d99c",
                color: currentShortIndex !== 0 ? "#000" : "rgba(0, 0, 0, 0.26)",
              }}
              disabled={currentShortIndex === 0}
              onClick={handleUpArrowClick}
            >
              <ArrowUpwardIcon />
            </IconButton>
            <IconButton
              aria-label="arrow down"
              style={{
                background:
                  hasNextPage || currentShortIndex < allShorts.length - 1
                    ? "#D9D9D9"
                    : "#d9d9d99c",
                color:
                  hasNextPage || currentShortIndex < allShorts.length - 1
                    ? "#000"
                    : "rgba(0, 0, 0, 0.26)",
              }}
              disabled={
                !hasNextPage && currentShortIndex >= allShorts.length - 1
              }
              onClick={handleDownArrowClick}
            >
              <ArrowDownwardIcon />
            </IconButton>
          </div>
        )}
        <div style={iconButtonStyles}>
          <IconButton aria-label="like">
            <FavoriteIcon
              sx={{ color: likeStatus ? "#E74040" : "#fff" }}
              onClick={() => handleLike(currentShort?.lens_id)}
            />
          </IconButton>
          <IconButton aria-label="comment">
            <TextsmsIcon
              sx={{ color: "#fff" }}
              onClick={() => setChatAction(true)}
            />
          </IconButton>
          <IconButton
            aria-label="share"
            onClick={() => setShowShareAction(true)}
          >
            <ShareIcon fontSize="large" />
          </IconButton>
          <IconButton aria-label="share on WhatsApp">
            <WhatsappShareButton url={""} title={storyTitle}>
              <WhatsAppIcon sx={{ color: "#00C853" }} />
            </WhatsappShareButton>
          </IconButton>
          <IconButton aria-label="more">
            <MoreHorizIcon
              sx={{ color: "#fff" }}
              onClick={() => setMoreAction(true)}
            />
          </IconButton>
        </div>
        {!currentShort?.is_video && currentShort?.audio_url && (
          <IconButton
            onClick={handleAudioMuteUnmute}
            sx={{
              color: "#fff",
              position: "absolute",
              bottom: "80px",
              right: "14px",
              zIndex: 1,
            }}
          >
            {isAudioMuted ? (
              <VolumeOffIcon sx={{ fontSize: "24px" }} />
            ) : (
              <VolumeUpIcon sx={{ fontSize: "24px" }} />
            )}
          </IconButton>
        )}
      </>
    );
  };

  const renderShort = (short, index) => {
    if (!short) return null;

    const isActive = index === currentShortIndex;
    const isNext = index === currentShortIndex + 1;
    const isPrevious = index === currentShortIndex - 1;

    return (
      <div
        className={`short-container ${
          isActive
            ? "active"
            : isNext
            ? "next"
            : isPrevious
            ? "previous"
            : "inactive"
        }`}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          transition: isNext || isPrevious ? "transform 0.5s ease-out" : "none",
          transform: isActive
            ? `translateY(${dragDistance}px)`
            : isNext
            ? `translateY(${window.innerHeight + dragDistance}px)`
            : isPrevious
            ? `translateY(${-window.innerHeight + dragDistance}px)`
            : "translateY(200%)",
          zIndex: isActive ? 1 : isNext || isPrevious ? 0 : -1,
        }}
      >
        {short.is_video ? (
          <div style={{ position: "relative" }}>
            <div
              style={{
                position: "relative",
                width: "100%",
                maxWidth: "calc(100vh * 9 / 16)",
                height: "calc(100vh - 56px)",
                background: "#000",
                overflow: "hidden",
                margin: "0 auto",
              }}
            >
              <video
                key={index}
                // ref={videoRef}
                ref={(el) => (videoRef.current[index] = el)}
                src={short.video_details?.file_url}
                controls={false}
                autoPlay={isActive}
                loop
                muted={isAudioMuted}
                onPlay={handleInteraction}
                onPause={stopInteraction}
                onEnded={stopInteraction}
                playsInline
                preload="auto"
                style={{
                  display: isActive ? "block" : "none", // Hide inactive videos
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                }}
              />
            </div>
            <div
              style={{
                position: "absolute",
                bottom: "31px",
                right: "14px",
                display: "flex",
                justifyContent: "space-between",
                zIndex: 1,
                alignItems: "center",
              }}
            >
              <IconButton onClick={handlePlayPause} sx={{ color: "#fff" }}>
                {isPlaying ? (
                  <PauseIcon sx={{ fontSize: "24px" }} />
                ) : (
                  <PlayArrowIcon sx={{ fontSize: "24px" }} />
                )}
              </IconButton>
              <IconButton
                onClick={handleAudioMuteUnmute}
                sx={{ color: "#fff" }}
              >
                {isAudioMuted ? (
                  <VolumeOffIcon sx={{ fontSize: "24px" }} />
                ) : (
                  <VolumeUpIcon sx={{ fontSize: "24px" }} />
                )}
              </IconButton>
            </div>
            <div
              style={{
                position: "absolute",
                bottom: "20px",
                color: "#fff",
                width: "75%",
                textAlign: "left",
                padding: "0px 20px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                marginBottom: "10px",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "104px",
                  background:
                    "linear-gradient(180deg, rgba(255, 255, 255, 0) 9.52%, rgba(0, 0, 0, 0.75) 44.7%, #000000 100%)",
                  filter: "blur(60px)",
                  zIndex: 0,
                }}
              ></div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "14px" }}
              >
                {!short.user_profile_url ? (
                  <Image
                    src={UserIcon}
                    onClick={() => {
                      otpRes?.user_id
                        ? router.push({
                            pathname: "./author",
                            query: { source_user_id: short?.user_id },
                          })
                        : toast({
                            type: "warning",
                            message: t("Userisnotloggedin"),
                          });
                    }}
                    alt="Album Art"
                    width={34}
                    height={34}
                    style={{ borderRadius: "40px", cursor: "pointer" }}
                  />
                ) : (
                  <Image
                    src={short.user_profile_url}
                    onClick={() => {
                      otpRes?.user_id
                        ? router.push({
                            pathname: "./author",
                            query: { source_user_id: short?.user_id },
                          })
                        : toast({
                            type: "warning",
                            message: t("Userisnotloggedin"),
                          });
                    }}
                    alt="Album Art"
                    width={34}
                    height={34}
                    style={{ borderRadius: "40px", cursor: "pointer" }}
                  />
                )}
                <Typography
                  component="div"
                  fontFamily={"Roboto"}
                  fontWeight={500}
                  fontSize={16}
                  onClick={() => {
                    otpRes?.user_id
                      ? router.push({
                          pathname: "./author",
                          query: { source_user_id: short?.user_id },
                        })
                      : toast({
                          type: "warning",
                          message: t("Userisnotloggedin"),
                        });
                  }}
                  sx={{
                    textTransform: "capitalize",
                    lineHeight: "18px",
                    textAlign: "left",
                    zIndex: 1,
                    cursor: "pointer",
                  }}
                >
                  {short.submitterName}
                </Typography>
              </div>
              <Typography
                component="div"
                fontWeight={500}
                fontSize={16}
                sx={{
                  userSelect: "none",
                  textTransform: "capitalize",
                  lineHeight: "16px",
                  textAlign: "left",
                  position: "relative",
                  zIndex: 1,
                  fontFamily: "Faustina",
                }}
              >
                {short.video_details.title}
              </Typography>
              <Typography
                component="div"
                fontWeight={500}
                fontSize={14}
                sx={{
                  userSelect: "none",
                  textTransform: "capitalize",
                  lineHeight: "16px",
                  textAlign: "left",
                  position: "relative",
                  zIndex: 1,
                  fontFamily: "Faustina",
                }}
              >
                {short.video_details.description}
              </Typography>
            </div>
          </div>
        ) : (
          short.images_details && (
            <div key={short.lens_id}>
              <Swiper
                modules={[Pagination, Autoplay]}
                pagination={{
                  clickable: true,
                  el: `.custom-swiper-pagination-${short.lens_id}`,
                }}
                slidesPerView={1}
                spaceBetween={0}
                style={{ height: "calc(100vh - 56px)" }}
                autoplay={{ delay: 5450, disableOnInteraction: false }}
                speed={1000}
              >
                {short.images_details.map((imageDetail) => (
                  <SwiperSlide key={imageDetail.file_id}>
                    <div>
                      <div
                        style={{
                          position: "relative",
                          width: "100%",
                          maxWidth: "calc(100vh * 9 / 16)",
                          height: "calc(100vh - 56px)",
                          background: "#000",
                          overflow: "hidden",
                          margin: "0 auto",
                        }}
                      >
                        <Image
                          src={imageDetail.url}
                          alt={imageDetail.title}
                          layout="fill"
                          objectFit="contain"
                          onLoad={handleInteraction}
                        />
                      </div>
                      <div
                        style={{
                          position: "absolute",
                          bottom: "110px",
                          color: "#fff",
                          width: "100%",
                          textAlign: "center",
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            background:
                              "linear-gradient(180deg, rgba(255, 255, 255, 0) 9.52%, rgba(0, 0, 0, 0.75) 44.7%, #000000 100%)",
                            filter: "blur(60px)",
                            zIndex: 0,
                          }}
                        ></div>
                        <Typography
                          component="div"
                          fontWeight={600}
                          fontSize={36}
                          sx={{
                            userSelect: "none",
                            textTransform: "capitalize",
                            lineHeight: "40px",
                            textAlign: "center",
                            padding: "0px 43px",
                            position: "relative",
                            zIndex: 1,
                            fontFamily: "Faustina",
                          }}
                        >
                          {imageDetail.title}
                        </Typography>
                        {imageDetail.description && (
                          <Typography
                            component="div"
                            fontWeight={300}
                            fontSize={24}
                            sx={{
                              userSelect: "none",
                              textTransform: "capitalize",
                              lineHeight: "24px",
                              textAlign: "center",
                              marginTop: "36px",
                              padding: "0px 26px",
                              position: "relative",
                              zIndex: 1,
                              fontFamily: "Faustina",
                            }}
                          >
                            {imageDetail.description}
                          </Typography>
                        )}
                      </div>
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
              {!short.is_video && (
                <div
                  className={`custom-swiper-pagination-${short.lens_id}`}
                  style={{
                    position: "absolute",
                    bottom: "132px",
                    left: "0",
                    right: "0",
                    display: "flex",
                    justifyContent: "center",
                    zIndex: 1,
                  }}
                />
              )}
              {short.audio_url ? (
                <AudioPlayer
                  audioUrl={short.audio_url}
                  isActive={isActive}
                  isAudioMuted={isAudioMuted}
                />
              ) : (
                <AudioPlayer
                  audioUrl={null}
                  isActive={isActive}
                  isAudioMuted={isAudioMuted}
                />
              )}
            </div>
          )
        )}
        {renderIcons()}
      </div>
    );
  };

  return (
    <Container
      ref={firstBoxRef}
      onTouchStart={isMobile ? handleTouchStart : undefined}
      onTouchMove={isMobile ? handleTouchMove : undefined}
      onTouchEnd={isMobile ? handleTouchEnd : undefined}
      sx={{
        background: "#000",
        width: !isMobile ? "454px" : "100%",
        borderRadius: 0,
        padding: "0px !important",
        position: "relative",
        overflow: "hidden",
        height: "100vh",
      }}
    >
      {renderShort(allShorts[currentShortIndex - 1], currentShortIndex - 1)}
      {renderShort(allShorts[currentShortIndex], currentShortIndex)}
      {renderShort(allShorts[currentShortIndex + 1], currentShortIndex + 1)}
    </Container>
  );
};

export default Lens;
