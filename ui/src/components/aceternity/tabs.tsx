"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "./cn";

type Tab = {
  title: string;
  value: string;
  content?: string | React.ReactNode;
};

export const Tabs: React.FC<{
  tabs: Tab[];
  containerClassName?: string;
  activeTabClassName?: string;
  tabClassName?: string;
  contentClassName?: string;
  onChange?: (value: string) => void;
}> = ({
  tabs,
  containerClassName,
  activeTabClassName,
  tabClassName,
  contentClassName,
  onChange,
}) => {
  const [active, setActive] = useState<Tab>(tabs[0]);
  const [hovering, setHovering] = useState(false);

  const handleTabChange = (tab: Tab) => {
    setActive(tab);
    onChange?.(tab.value);
  };

  return (
    <>
      <div
        className={cn(
          "flex flex-row items-center justify-start gap-1 p-1 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] overflow-auto scrollbar-hide relative max-w-full w-full",
          containerClassName
        )}
      >
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => handleTabChange(tab)}
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
            className={cn(
              "relative px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              tabClassName
            )}
          >
            {active.value === tab.value && (
              <motion.div
                layoutId="clickedbutton"
                transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
                className={cn(
                  "absolute inset-0 bg-[var(--color-bg-card)] rounded-lg shadow-sm",
                  activeTabClassName
                )}
              />
            )}
            <span
              className={cn(
                "relative z-10 block",
                active.value === tab.value
                  ? "text-[var(--color-text-primary)]"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              )}
            >
              {tab.title}
            </span>
          </button>
        ))}
      </div>
      <FadeInDiv
        key={active.value}
        active={active}
        className={cn("mt-4", contentClassName)}
        hovering={hovering}
      />
    </>
  );
};

export const FadeInDiv: React.FC<{
  className?: string;
  active: Tab;
  hovering?: boolean;
}> = ({ className, active }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className={cn("w-full", className)}
    >
      {active.content}
    </motion.div>
  );
};

// Simple tabs without content - just for navigation
export const TabList: React.FC<{
  tabs: { title: string; value: string; icon?: React.ReactNode }[];
  activeTab: string;
  onChange: (value: string) => void;
  className?: string;
}> = ({ tabs, activeTab, onChange, className }) => {
  return (
    <div
      className={cn(
        "flex flex-row items-center gap-1 p-1 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)]",
        className
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className="relative px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {activeTab === tab.value && (
            <motion.div
              layoutId="activetab"
              transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
              className="absolute inset-0 bg-[var(--color-bg-card)] rounded-lg shadow-sm"
            />
          )}
          <span
            className={cn(
              "relative z-10 flex items-center gap-2",
              activeTab === tab.value
                ? "text-[var(--color-text-primary)]"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            )}
          >
            {tab.icon}
            {tab.title}
          </span>
        </button>
      ))}
    </div>
  );
};

export default Tabs;
