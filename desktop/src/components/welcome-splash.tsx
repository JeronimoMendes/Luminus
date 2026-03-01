import {
	AnimatePresence,
	motion,
	useMotionValue,
	useSpring,
} from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

const stagger = {
	animate: { transition: { staggerChildren: 0.15, delayChildren: 0.2 } },
};

const fadeUp = {
	initial: { opacity: 0, y: 16 },
	animate: { opacity: 1, y: 0 },
};

const ATTRACT_STRENGTH = 0.08;

export function WelcomeSplash({ onDone }: { onDone: () => void }) {
	const [visible, setVisible] = useState(true);
	const orbRef = useRef<HTMLImageElement>(null);
	const rawX = useMotionValue(0);
	const rawY = useMotionValue(0);
	const x = useSpring(rawX, { stiffness: 80, damping: 20 });
	const y = useSpring(rawY, { stiffness: 80, damping: 20 });

	useEffect(() => {
		const handleMouseMove = (e: MouseEvent) => {
			if (!orbRef.current) return;
			const rect = orbRef.current.getBoundingClientRect();
			const orbCenterX = rect.left + rect.width / 2;
			const orbCenterY = rect.top + rect.height / 2;
			rawX.set((e.clientX - orbCenterX) * ATTRACT_STRENGTH);
			rawY.set((e.clientY - orbCenterY) * ATTRACT_STRENGTH);
		};
		window.addEventListener("mousemove", handleMouseMove);
		return () => window.removeEventListener("mousemove", handleMouseMove);
	}, [rawX, rawY]);

	const handleGetStarted = () => {
		localStorage.setItem("luminus-welcomed", "true");
		setVisible(false);
	};

	return (
		<AnimatePresence onExitComplete={onDone}>
			{visible && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0, scale: 0.96 }}
					transition={{ duration: 0.4, ease: "easeInOut" }}
					className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background"
				>
					<motion.div
						variants={stagger}
						initial="initial"
						animate="animate"
						className="flex flex-col items-center gap-6 text-center"
					>
						<motion.div
							variants={fadeUp}
							transition={{ duration: 0.6, ease: "easeOut" }}
						>
							<motion.img
								ref={orbRef}
								src="/orb.png"
								alt="Luminus"
								className="size-28"
								style={{ x, y }}
								animate={{
									filter: [
										"drop-shadow(0 0 16px rgba(255,180,100,0.25))",
										"drop-shadow(0 0 40px rgba(255,160,80,0.7))",
										"drop-shadow(0 0 16px rgba(255,180,100,0.25))",
									],
									scale: [1, 1.1, 1],
								}}
								transition={{
									duration: 2.5,
									repeat: Number.POSITIVE_INFINITY,
									ease: "easeInOut",
								}}
							/>
						</motion.div>
						<motion.h1
							variants={fadeUp}
							transition={{ duration: 0.5, ease: "easeOut" }}
							className="text-3xl font-semibold tracking-tight"
						>
							Luminus
						</motion.h1>
						<motion.p
							variants={fadeUp}
							transition={{ duration: 0.5, ease: "easeOut" }}
							className="text-muted-foreground text-sm max-w-xs"
						>
							Browse, search, and manage your photo library with the power of
							AI.
						</motion.p>
						<motion.div
							variants={fadeUp}
							transition={{ duration: 0.5, ease: "easeOut" }}
						>
							<Button size="lg" onClick={handleGetStarted}>
								Get Started
							</Button>
						</motion.div>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
