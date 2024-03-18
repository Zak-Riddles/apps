import React, { ReactElement, useEffect, useRef, useState } from 'react';
import { useOnboardingContext } from '@dailydotdev/shared/src/contexts/OnboardingContext';
import { ProgressBar } from '@dailydotdev/shared/src/components/fields/ProgressBar';
import classNames from 'classnames';
import AuthOptions, {
  AuthDisplay,
  AuthProps,
} from '@dailydotdev/shared/src/components/auth/AuthOptions';
import { AuthTriggers } from '@dailydotdev/shared/src/lib/auth';
import {
  CreateFeedButton,
  FilterOnboardingV4,
  OnboardingHeader,
} from '@dailydotdev/shared/src/components/onboarding';
import {
  Button,
  ButtonIconPosition,
  ButtonSize,
  ButtonVariant,
} from '@dailydotdev/shared/src/components/buttons/Button';
import {
  ExperimentWinner,
  OnboardingCopy,
  OnboardingV4dot5,
  UserAcquisition,
} from '@dailydotdev/shared/src/lib/featureValues';
import { storageWrapper as storage } from '@dailydotdev/shared/src/lib/storageWrapper';
import classed from '@dailydotdev/shared/src/lib/classed';
import { useRouter } from 'next/router';
import { useAnalyticsContext } from '@dailydotdev/shared/src/contexts/AnalyticsContext';
import {
  AnalyticsEvent,
  Origin,
  TargetType,
} from '@dailydotdev/shared/src/lib/analytics';
import {
  OnboardingStep,
  REQUIRED_TAGS_THRESHOLD,
  wrapperMaxWidth,
} from '@dailydotdev/shared/src/components/onboarding/common';
import {
  OnboardingMode,
  PREVIEW_FEED_QUERY,
} from '@dailydotdev/shared/src/graphql/feed';
import { useAuthContext } from '@dailydotdev/shared/src/contexts/AuthContext';
import { NextSeo, NextSeoProps } from 'next-seo';
import { SIGNIN_METHOD_KEY } from '@dailydotdev/shared/src/hooks/auth/useSignBack';
import {
  useFeature,
  useGrowthBookContext,
} from '@dailydotdev/shared/src/components/GrowthBookProvider';
import TrustedCompanies from '@dailydotdev/shared/src/components/TrustedCompanies';
import { IconSize } from '@dailydotdev/shared/src/components/Icon';
import { cloudinary } from '@dailydotdev/shared/src/lib/image';
import SignupDisclaimer from '@dailydotdev/shared/src/components/auth/SignupDisclaimer';
import { withFeaturesBoundary } from '@dailydotdev/shared/src/components';
import Feed from '@dailydotdev/shared/src/components/Feed';
import { OtherFeedPage, RequestKey } from '@dailydotdev/shared/src/lib/query';
import FeedLayout from '@dailydotdev/shared/src/components/FeedLayout';
import useFeedSettings from '@dailydotdev/shared/src/hooks/useFeedSettings';
import { ArrowIcon } from '@dailydotdev/shared/src/components/icons';
import {
  GtagTracking,
  PixelTracking,
  TwitterTracking,
} from '@dailydotdev/shared/src/components/auth/OnboardingAnalytics';
import { feature } from '@dailydotdev/shared/src/lib/featureManagement';
import {
  OnboardingHeadline,
  PreparingYourFeed,
  OnboardingContainer as Container,
} from '@dailydotdev/shared/src/components/auth';
import { useViewSize, ViewSize } from '@dailydotdev/shared/src/hooks';
import { useOnboardingAnimation } from '@dailydotdev/shared/src/hooks/auth';
import { ActiveUsersCounter } from '@dailydotdev/shared/src/components/auth/ActiveUsersCounter';
import { defaultOpenGraph, defaultSeo } from '../next-seo';
import styles from '../components/layouts/Onboarding/index.module.css';

const Title = classed('h2', 'font-bold');

const maxAuthWidth = 'tablet:max-w-[30rem]';

const seo: NextSeoProps = {
  title: 'Get started',
  openGraph: { ...defaultOpenGraph },
  ...defaultSeo,
};

export function OnboardPage(): ReactElement {
  const router = useRouter();
  const isTracked = useRef(false);
  const { user, isAuthReady, anonymous } = useAuthContext();
  const shouldVerify = anonymous?.shouldVerify;
  const [isFiltering, setIsFiltering] = useState(false);
  const {
    isAnimating,
    finishedOnboarding,
    onFinishedOnboarding,
    postOnboardingRedirect,
  } = useOnboardingAnimation();
  const { onShouldUpdateFilters } = useOnboardingContext();
  const { growthbook } = useGrowthBookContext();
  const { trackEvent } = useAnalyticsContext();
  const [hasSelectTopics, setHasSelectTopics] = useState(false);
  const [auth, setAuth] = useState<AuthProps>({
    isAuthenticating: !!storage.getItem(SIGNIN_METHOD_KEY) || shouldVerify,
    isLoginFlow: false,
    defaultDisplay: shouldVerify
      ? AuthDisplay.EmailVerification
      : AuthDisplay.OnboardingSignup,
    ...(anonymous?.email && { email: anonymous.email }),
  });
  const { isAuthenticating, isLoginFlow, email, defaultDisplay } = auth;
  const isPageReady = growthbook?.ready && isAuthReady;
  const { feedSettings } = useFeedSettings();
  type OnboardingVisual = {
    showCompanies?: boolean;
    image?: string;
    poster?: string;
    webm?: string;
    mp4?: string;
  };
  const isMobile = useViewSize(ViewSize.MobileL);
  const onboardingVisual: OnboardingVisual = useFeature(
    feature.onboardingVisual,
  );
  const onboardingOptimizations = useFeature(feature.onboardingOptimizations);
  const isOnboardingCopyV1 =
    useFeature(feature.onboardingCopy) === OnboardingCopy.V1;
  const onboardingV4dot5 = useFeature(feature.onboardingV4dot5);
  const userAcquisitionVersion = useFeature(feature.userAcquisition);
  const targetId: string =
    onboardingV4dot5 === OnboardingV4dot5.Control
      ? ExperimentWinner.OnboardingV4
      : OnboardingV4dot5.V4dot5;
  const formRef = useRef<HTMLFormElement>();

  const onClickNext = () => {
    let screen = OnboardingStep.Intro;

    if (isFiltering) {
      screen = OnboardingStep.EditTag;
    }

    trackEvent({
      event_name: AnalyticsEvent.ClickOnboardingNext,
      extra: JSON.stringify({ screen_value: screen }),
    });

    if (!isFiltering) {
      return setIsFiltering(true);
    }

    onFinishedOnboarding();
    if (!hasSelectTopics) {
      trackEvent({
        event_name: AnalyticsEvent.OnboardingSkip,
      });

      onShouldUpdateFilters(true);
    } else {
      trackEvent({
        event_name: AnalyticsEvent.CreateFeed,
      });
    }

    return postOnboardingRedirect({
      pathname: '/',
      query: {
        ...(userAcquisitionVersion === UserAcquisition.V1 && {
          ua: 'true',
        }),
        ...(!onboardingOptimizations && {
          welcome: 'true',
          hset: 'true',
        }),
      },
    });
  };

  const onSuccessfulLogin = () => {
    router.replace('/');
  };

  const onSuccessfulRegistration = () => {
    if (onboardingV4dot5 === OnboardingV4dot5.Control) {
      setIsFiltering(true);
    } else {
      router.replace({
        pathname: '/my-feed',
      });
    }
  };

  useEffect(() => {
    if (!isPageReady || isTracked.current) {
      return;
    }

    if (user) {
      router.replace('/');
      return;
    }

    trackEvent({
      event_name: AnalyticsEvent.Impression,
      target_type: TargetType.MyFeedModal,
      target_id: targetId,
      extra: JSON.stringify({
        origin: OnboardingMode.Wall,
        steps: [OnboardingStep.Topics],
        mandating_categories: 0,
      }),
    });
    isTracked.current = true;
    // @NOTE see https://dailydotdev.atlassian.net/l/cp/dK9h1zoM
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackEvent, isPageReady, user, targetId]);

  useEffect(() => {
    setHasSelectTopics(!!feedSettings?.includeTags?.length);
  }, [feedSettings?.includeTags?.length]);

  const getAuthOptions = () => {
    return (
      <AuthOptions
        simplified
        className={{
          container: classNames(
            'w-full rounded-none',
            maxAuthWidth,
            isAuthenticating && 'h-full',
            !isAuthenticating && 'max-w-full',
          ),
          onboardingSignup: classNames(
            '!gap-5 !pb-5 tablet:gap-8 tablet:pb-8',
            isOnboardingCopyV1 && 'flex !flex-row *:grow',
          ),
        }}
        trigger={AuthTriggers.Onboarding}
        formRef={formRef}
        defaultDisplay={defaultDisplay}
        forceDefaultDisplay={!isAuthenticating}
        initialEmail={email}
        isLoginFlow={isLoginFlow}
        targetId={targetId}
        onSuccessfulLogin={onSuccessfulLogin}
        onSuccessfulRegistration={onSuccessfulRegistration}
        onAuthStateUpdate={(props: AuthProps) =>
          setAuth({ isAuthenticating: true, ...props })
        }
        onboardingSignupButton={{
          size: isMobile ? ButtonSize.Medium : ButtonSize.Large,
          variant: isOnboardingCopyV1
            ? ButtonVariant.Float
            : ButtonVariant.Primary,
        }}
      />
    );
  };

  const [isPreviewVisible, setPreviewVisible] = useState(false);

  const getContent = (): ReactElement => {
    const tagsCount = feedSettings?.includeTags?.length || 0;
    const isPreviewEnabled = tagsCount >= REQUIRED_TAGS_THRESHOLD;

    if (isAuthenticating && !isFiltering) {
      return getAuthOptions();
    }

    return (
      <div
        className={classNames(
          'flex tablet:flex-1',
          !isFiltering && 'tablet:ml-auto laptop:max-w-[37.5rem]',
          isFiltering &&
            'mb-10 ml-0 flex w-full flex-col items-center justify-start',
        )}
      >
        {isFiltering && (
          <>
            <Title className="text-center typo-large-title">
              Pick tags that are relevant to you
            </Title>
            <FilterOnboardingV4 className="mt-10 max-w-4xl" />
            <Button
              className="mt-10"
              variant={
                isPreviewVisible
                  ? ButtonVariant.Primary
                  : ButtonVariant.Secondary
              }
              disabled={!isPreviewEnabled}
              icon={
                <ArrowIcon
                  className={classNames(!isPreviewVisible && 'rotate-180')}
                />
              }
              iconPosition={ButtonIconPosition.Right}
              onClick={() => {
                setPreviewVisible((current) => {
                  const newValue = !current;

                  trackEvent({
                    event_name: AnalyticsEvent.ToggleFeedPreview,
                    target_id: newValue,
                    extra: JSON.stringify({ origin: Origin.EditTag }),
                  });

                  return newValue;
                });
              }}
            >
              {isPreviewEnabled
                ? `${isPreviewVisible ? 'Hide' : 'Show'} feed preview`
                : `${tagsCount}/${REQUIRED_TAGS_THRESHOLD} to show feed preview`}
            </Button>
            {isPreviewEnabled && isPreviewVisible && (
              <FeedLayout>
                <p className="-mb-4 mt-6 text-center text-theme-label-secondary typo-body">
                  Change your tag selection until you&apos;re happy with your
                  feed preview.
                </p>
                <Feed
                  className="px-6 pt-14 laptop:pt-10"
                  feedName={OtherFeedPage.Preview}
                  feedQueryKey={[RequestKey.FeedPreview, user?.id]}
                  query={PREVIEW_FEED_QUERY}
                  forceCardMode
                  showSearch={false}
                  options={{ refetchOnMount: true }}
                  allowPin
                />
                <CreateFeedButton className="mt-20" onClick={onClickNext} />
              </FeedLayout>
            )}
          </>
        )}
        {!isFiltering && (
          <div className="block flex-1">
            <div
              className={classNames(
                'tablet:min-h-[800px]:pt-[100%] relative overflow-y-clip tablet:overflow-y-visible tablet:pt-[80%]',
              )}
            >
              {onboardingVisual?.poster ? (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video
                  loop
                  autoPlay
                  muted
                  className={classNames(
                    'tablet:absolute tablet:left-0 tablet:top-0 tablet:-z-1',
                    styles.video,
                  )}
                  poster={onboardingVisual.poster}
                >
                  <source src={onboardingVisual.webm} type="video/webm" />
                  <source src={onboardingVisual.mp4} type="video/mp4" />
                </video>
              ) : (
                <img
                  src={onboardingVisual.image}
                  alt="Onboarding cover"
                  className={classNames(
                    'relative tablet:absolute tablet:left-0 tablet:top-0 tablet:-z-1',
                    styles.image,
                  )}
                />
              )}
            </div>
            {onboardingVisual.showCompanies && (
              <TrustedCompanies className="hidden tablet:block" />
            )}
          </div>
        )}
      </div>
    );
  };

  const shouldShowOnline = useFeature(feature.onboardingOnlineUsers);

  const getProgressBar = () => {
    if (isFiltering) {
      return null;
    }

    const percentage = isFiltering ? 100 : 50;
    return <ProgressBar percentage={isAuthenticating ? percentage : 0} />;
  };

  const showOnboardingPage = !isAuthenticating && !isFiltering && !shouldVerify;

  if (!isPageReady) {
    return null;
  }

  if (finishedOnboarding) {
    return <PreparingYourFeed isAnimating={isAnimating} />;
  }

  return (
    <Container className="bg-[#0e1019]">
      <NextSeo {...seo} titleTemplate="%s | daily.dev" />
      <PixelTracking />
      <GtagTracking />
      <TwitterTracking />
      {getProgressBar()}
      <OnboardingHeader
        showOnboardingPage={showOnboardingPage}
        setAuth={setAuth}
        onClickNext={onClickNext}
        isFiltering={isFiltering}
      />
      <div
        className={classNames(
          'flex w-full flex-grow flex-col flex-wrap justify-center px-4 tablet:flex-row tablet:gap-10 tablet:px-6',
          !isFiltering && wrapperMaxWidth,
          !isAuthenticating && 'mt-7.5 flex-1 content-center',
        )}
      >
        {showOnboardingPage && (
          <div
            className={classNames(
              'flex flex-1 flex-col laptop:mr-8 laptop:max-w-[27.5rem]',
              `${isOnboardingCopyV1 ? 'mt-6' : 'mt-5'} tablet:mt-0`,
            )}
          >
            {shouldShowOnline && <ActiveUsersCounter />}
            <OnboardingHeadline
              className={{
                title: classNames(
                  'typo-large-title',
                  isOnboardingCopyV1
                    ? 'tablet:typo-mega2'
                    : 'tablet:typo-mega-1',
                ),
                description: 'typo-body tablet:typo-title2',
              }}
              isOnboardingCopyV1={isOnboardingCopyV1}
            />
            {getAuthOptions()}
          </div>
        )}
        {showOnboardingPage && (
          <SignupDisclaimer className="mb-0 tablet:mb-10 tablet:hidden" />
        )}
        {getContent()}
      </div>
      {showOnboardingPage && (
        <footer
          className={classNames(
            'flex h-full max-h-[10rem] w-full px-4 tablet:px-6',
            wrapperMaxWidth,
          )}
        >
          <div className="relative flex flex-1 flex-col gap-6 pb-6 tablet:mt-auto laptop:mr-8 laptop:max-w-[27.5rem]">
            <SignupDisclaimer className="mb-0 hidden tablet:mb-10 tablet:block" />

            <TrustedCompanies
              iconSize={IconSize.Small}
              reverse
              className=" mt-5 block tablet:hidden"
            />

            <img
              className="absolute bottom-0 left-0 -z-1 w-full max-w-[58.75rem]"
              src={cloudinary.onboarding.glow}
              alt="Gradient background"
            />
          </div>
          <div className="hidden flex-1 tablet:block" />
        </footer>
      )}
    </Container>
  );
}

export default withFeaturesBoundary(OnboardPage);
