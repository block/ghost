"use client";

import {
  InlineCitation,
  InlineCitationCard,
  InlineCitationCardBody,
  InlineCitationCardTrigger,
  InlineCitationCarousel,
  InlineCitationCarouselContent,
  InlineCitationCarouselHeader,
  InlineCitationCarouselIndex,
  InlineCitationCarouselItem,
  InlineCitationCarouselNext,
  InlineCitationCarouselPrev,
  InlineCitationSource,
  InlineCitationText,
} from "ghost-ui";

const sources = [
  "https://en.wikipedia.org/wiki/Large_language_model",
  "https://arxiv.org/abs/2303.08774",
];

export function InlineCitationDemo() {
  return (
    <p className="max-w-lg text-sm leading-relaxed">
      Large language models are neural networks trained on vast amounts of text
      data.{" "}
      <InlineCitation>
        <InlineCitationText>
          They use transformer architectures to generate coherent text
        </InlineCitationText>
        <InlineCitationCard>
          <InlineCitationCardTrigger sources={sources} />
          <InlineCitationCardBody>
            <InlineCitationCarousel>
              <InlineCitationCarouselHeader>
                <InlineCitationCarouselPrev />
                <InlineCitationCarouselIndex />
                <InlineCitationCarouselNext />
              </InlineCitationCarouselHeader>
              <InlineCitationCarouselContent>
                <InlineCitationCarouselItem>
                  <InlineCitationSource
                    title="Large language model"
                    url={sources[0]}
                    description="A large language model is a computational model notable for its ability to achieve general-purpose language generation."
                  />
                </InlineCitationCarouselItem>
                <InlineCitationCarouselItem>
                  <InlineCitationSource
                    title="GPT-4 Technical Report"
                    url={sources[1]}
                    description="We report the development of GPT-4, a large-scale multimodal model."
                  />
                </InlineCitationCarouselItem>
              </InlineCitationCarouselContent>
            </InlineCitationCarousel>
          </InlineCitationCardBody>
        </InlineCitationCard>
      </InlineCitation>{" "}
      and have become a cornerstone of modern AI applications.
    </p>
  );
}
