"use client";
import React from "react";
import { motion } from "framer-motion";
import { ChapterData } from "./experienceData";

export function ChapterOverlay({ chapter, active, reducedMotion, children }: {
  chapter: ChapterData; active: boolean; reducedMotion: boolean; children?: React.ReactNode;
}) {
  return <motion.div className="experience-chapter-card"
    animate={{ opacity: active ? 1 : 0.38, y: active || reducedMotion ? 0 : 14 }}
    transition={{ duration: reducedMotion ? 0 : 0.45 }}>
    <p className="experience-eyebrow"><span />{chapter.label}</p>
    <h1>{chapter.headline}</h1>
    <p className="experience-description">{chapter.description}</p>
    {children}
  </motion.div>;
}

