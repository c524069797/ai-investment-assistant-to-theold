"use client";

import { motion, useReducedMotion, type Transition, type Variants } from "framer-motion";
import { type CSSProperties, type ReactNode } from "react";

// 基础动画变体
const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
};

const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};

const slideInRight: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0 },
};

// 容器动画变体（用于 stagger children）
const staggerContainer: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

// 默认过渡配置
const defaultTransition: Transition = {
  duration: 0.4,
  ease: [0.25, 1, 0.5, 1], // ease-out-quart
};

// Props 类型
interface MotionProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  delay?: number;
  duration?: number;
  once?: boolean;
}

/**
 * 入场触发边界：视口底部向外扩 200px，元素还没滚进屏幕动画就开始，
 * 用户滚到时内容已就位。负值（旧的 -50px）会让用户先看到空白再看到闪现，
 * 首页"底部大片空白"的体感就是这么来的。
 */
const IN_VIEW_MARGIN = "0px 0px 200px 0px";

/**
 * 五种入场动画共用的实现。prefers-reduced-motion 时直接渲染普通
 * div（内容立即可见），既是无障碍要求，也兜底了动画不触发的极端场景。
 */
function InViewMotion({
  children,
  className,
  style,
  delay = 0,
  duration = 0.4,
  once = true,
  variants,
}: MotionProps & { variants: Variants }) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={className}
      style={style}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin: IN_VIEW_MARGIN }}
      variants={variants}
      transition={{ ...defaultTransition, duration, delay }}
    >
      {children}
    </motion.div>
  );
}

/** 入场动画：淡入上移 */
export function FadeInUp(props: MotionProps) {
  return <InViewMotion {...props} variants={fadeInUp} />;
}

/** 入场动画：淡入 */
export function FadeIn(props: MotionProps) {
  return <InViewMotion {...props} variants={fadeIn} />;
}

/** 入场动画：缩放淡入 */
export function ScaleIn(props: MotionProps) {
  return <InViewMotion {...props} variants={scaleIn} />;
}

/** 入场动画：从左滑入 */
export function SlideInLeft(props: MotionProps) {
  return <InViewMotion {...props} variants={slideInLeft} />;
}

/** 入场动画：从右滑入 */
export function SlideInRight(props: MotionProps) {
  return <InViewMotion {...props} variants={slideInRight} />;
}

/**
 * 容器组件：子元素依次入场
 */
export function StaggerContainer({ children, className, style, delay = 0, once = true }: MotionProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={className}
      style={style}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin: IN_VIEW_MARGIN }}
      variants={staggerContainer}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}

/**
 * 子元素：用于 StaggerContainer 内部
 */
export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div className={className} variants={fadeInUp} transition={defaultTransition}>
      {children}
    </motion.div>
  );
}

/**
 * Hover 动画：轻微放大
 */
export function HoverScale({
  children,
  className,
  scale = 1.02,
}: {
  children: ReactNode;
  className?: string;
  scale?: number;
}) {
  return (
    <motion.div
      className={className}
      whileHover={{ scale }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15 }}
    >
      {children}
    </motion.div>
  );
}

/**
 * 价格变化动画
 */
export function PriceChange({
  children,
  className,
  value,
}: {
  children: ReactNode;
  className?: string;
  value: number;
}) {
  return (
    <motion.span
      className={className}
      key={value}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.span>
  );
}

/**
 * 数字计数动画
 */
export function CountUp({
  value,
  className,
  duration = 1,
}: {
  value: number;
  className?: string;
  duration?: number;
}) {
  return (
    <motion.span
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.span
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration, ease: "easeOut" }}
      >
        {value}
      </motion.span>
    </motion.span>
  );
}

/**
 * 页面切换动画
 */
export function PageTransition({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}

/**
 * 骨架屏加载动画
 */
export function SkeletonPulse({ className }: { className?: string }) {
  return (
    <motion.div
      className={className}
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}
