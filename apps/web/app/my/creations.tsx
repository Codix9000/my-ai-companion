"use client";
import { api } from "../../convex/_generated/api";
import { useEffect, useState } from "react";
import { useStablePaginatedQuery } from "../../app/lib/hooks/use-stable-query";
import { useConvexAuth } from "convex/react";
import { Button } from "@repo/ui/src/components";
import { ChevronRight } from "lucide-react";
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@repo/ui/src/components/carousel";
import { useTranslation } from "react-i18next";
import useCurrentUser from "../../app/lib/hooks/use-current-user";
import Link from "next/link";
import { NewCharacter } from "../../components/characters/my-characters";
import CharacterCardPlaceholder from "../../components/cards/character-card-placeholder";
import CharacterCard from "../../components/cards/character-card";
import { SignIn } from "@clerk/nextjs";

const Creations = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useConvexAuth();
  const { results, status, loadMore } = useStablePaginatedQuery(
    api.characters.listMy,
    isAuthenticated ? {} : "skip",
    { initialNumItems: 10 },
  );
  const allCharacters = results || [];
  const characters = allCharacters.filter(
    (character) => character.name && character.cardImageUrl,
  );

  const [_api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!_api) {
      return;
    }

    setCount(_api.scrollSnapList().length);
    setCurrent(_api.selectedScrollSnap() + 1);
    if (_api.selectedScrollSnap() + 1 >= _api.scrollSnapList().length - 10) {
      loadMore(10);
    }

    _api.on("select", () => {
      setCurrent(_api.selectedScrollSnap() + 1);
    });
  }, [_api, characters]);

  const me = useCurrentUser();
  const username = me?.name;
  if (!isAuthenticated)
    return (
      <div className="flex h-full min-h-[60vh] w-full flex-col items-center justify-center gap-8 py-32 lg:min-h-fit">
        <SignIn />
      </div>
    );

  return (
    <div className="relative flex flex-col gap-4 lg:gap-8">
      <div className="flex items-center gap-1 px-4 font-medium lg:mt-2 lg:px-0">
        <Link href="/my-characters" className="flex items-center gap-1">
          {t("My Characters")}
          <Button variant="ghost" size="icon">
            <ChevronRight />
          </Button>
        </Link>
      </div>

      <div className="relative flex place-content-center border-y py-4 lg:justify-start lg:border-none lg:py-0">
        <Carousel
          opts={{ align: "center" }}
          className="w-[75%] md:w-[80%] lg:w-[calc(80%+4rem)]"
          setApi={setApi}
        >
          <CarouselContent className="w-full">
            <CarouselItem
              className="md:basis-1/2 lg:basis-1/3 2xl:basis-1/4"
              key={"new-character"}
            >
              <NewCharacter />
            </CarouselItem>
            {characters?.length > 0
              ? characters.map(
                  (character, index) =>
                    character.name && (
                      <>
                        <CarouselItem
                          className="md:basis-1/2 lg:basis-1/3 2xl:basis-1/4"
                          key={character._id}
                        >
                          <CharacterCard
                            id={character._id}
                            name={character.name}
                            numChats={character.numChats as number}
                            cardImageUrl={character.cardImageUrl as string}
                            description={character.description}
                            model={character.model}
                            showEdit={true}
                            showHides={false}
                            isNSFW={
                              character?.isNSFW &&
                              me?.nsfwPreference !== "allow"
                            }
                          />
                        </CarouselItem>
                      </>
                    ),
                )
              : Array.from({ length: 10 }).map((_, index) => (
                  <CarouselItem
                    className="md:basis-1/2 lg:basis-1/3 2xl:basis-1/4"
                    key={index + "placeholder"}
                  >
                    <CharacterCardPlaceholder />
                  </CarouselItem>
                ))}
            {status === "LoadingMore" &&
              Array.from({ length: 10 }).map((_, index) => (
                <CarouselItem
                  className="md:basis-1/2 lg:basis-1/3 2xl:basis-1/4"
                  key={index + "loader"}
                >
                  <CharacterCardPlaceholder />
                </CarouselItem>
              ))}
          </CarouselContent>
          <CarouselPrevious variant="ghost" />
          <CarouselNext variant="ghost" />
        </Carousel>
      </div>

      {/* <MainStories /> */}
    </div>
  );
};

export default Creations;
