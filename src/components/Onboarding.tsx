import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  Calculator, 
  Calendar,
  ChevronRight,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const steps = [
  {
    title: "Controle seus ganhos",
    description: "Registre suas corridas e acompanhe seu faturamento diariamente.",
    icon: <TrendingUp className="h-12 w-12 text-primary" />,
    color: "bg-primary/10"
  },
  {
    title: "Descubra seu lucro real",
    description: "O app calcula combustível, manutenção e mostra seu lucro verdadeiro.",
    icon: <Calculator className="h-12 w-12 text-emerald-500" />,
    color: "bg-emerald-500/10"
  },
  {
    title: "Organize sua rotina",
    description: "Veja relatórios diários, semanais e mensais do seu desempenho.",
    icon: <Calendar className="h-12 w-12 text-blue-500" />,
    color: "bg-blue-500/10"
  }
];

export function Onboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const hasCompletedOnboarding = localStorage.getItem("mnl_onboarding_completed");
    if (!hasCompletedOnboarding) {
      setShow(true);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      completeOnboarding();
    }
  };

  const completeOnboarding = () => {
    localStorage.setItem("mnl_onboarding_completed", "true");
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md p-4">
      <div className="w-full max-w-[400px] overflow-hidden rounded-3xl bg-card border border-border shadow-2xl">
        <div className="p-8 text-center">
          <div className="mb-8 flex justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className={`flex h-24 w-24 items-center justify-center rounded-3xl ${steps[currentStep].color}`}
              >
                {steps[currentStep].icon}
              </motion.div>
            </AnimatePresence>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-bold font-display text-card-foreground">
                {steps[currentStep].title}
              </h2>
              <p className="text-muted-foreground">
                {steps[currentStep].description}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="mt-12 flex items-center justify-center gap-2">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === currentStep ? "w-8 bg-primary" : "w-2 bg-muted"
                }`}
              />
            ))}
          </div>

          <div className="mt-12 flex flex-col gap-3">
            <Button 
              onClick={handleNext} 
              className="w-full rounded-2xl h-12 text-base font-semibold shadow-lg shadow-primary/20"
            >
              {currentStep === steps.length - 1 ? "Começar a usar" : "Continuar"}
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
            
            <Button 
              variant="ghost" 
              onClick={completeOnboarding}
              className="w-full rounded-2xl h-12 text-muted-foreground hover:text-foreground"
            >
              Pular
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
