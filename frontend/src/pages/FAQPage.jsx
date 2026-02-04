import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { getTranslation } from '@/lib/translations';

export default function FAQPage() {
  const { language } = useLanguage();

  const faqs = [
    {
      question: getTranslation('faq.q1.question', language),
      answer: getTranslation('faq.q1.answer', language),
    },
    {
      question: getTranslation('faq.q2.question', language),
      answer: getTranslation('faq.q2.answer', language),
    },
    {
      question: getTranslation('faq.q3.question', language),
      answer: getTranslation('faq.q3.answer', language),
    },
    {
      question: getTranslation('faq.q4.question', language),
      answer: getTranslation('faq.q4.answer', language),
    },
    {
      question: getTranslation('faq.q5.question', language),
      answer: getTranslation('faq.q5.answer', language),
    },
    {
      question: getTranslation('faq.q6.question', language),
      answer: getTranslation('faq.q6.answer', language),
    },
  ];

  return (
    <div className="min-h-screen" data-testid="faq-page">
      {/* Hero Section */}
      <section className="relative py-12 md:py-20 px-4 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        
        <div className="max-w-4xl mx-auto relative">
          {/* Header */}
          <div className="text-center mb-10 md:mb-14">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading font-black tracking-tight mb-4">
              {getTranslation('faq.title', language)}
            </h1>
            <p className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto">
              {getTranslation('faq.subtitle', language)}
            </p>
          </div>

          {/* FAQ Accordion */}
          <Card className="mb-8">
            <CardContent className="p-0">
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`} className="px-6">
                    <AccordionTrigger className="text-left font-semibold">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>

          {/* Disclaimer */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground/70">
              {getTranslation('faq.disclaimer', language)}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
