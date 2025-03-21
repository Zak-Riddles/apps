import type { ReactElement } from 'react';
import React from 'react';
import classNames from 'classnames';
import { Button, ButtonVariant } from '../buttons/Button';
import { SimpleTooltip } from '../tooltips/SimpleTooltip';
import { ArrowIcon } from '../icons';
import { PostHeaderActions } from './PostHeaderActions';
import { PostPosition } from '../../hooks/usePostModalNavigation';
import type { PostNavigationProps } from './common';

function PostNavigation({
  postPosition,
  onPreviousPost,
  onNextPost,
  className = {},
  contextMenuId = 'post-navigation-context',
  ...props
}: PostNavigationProps): ReactElement {
  return (
    <div
      className={classNames(
        'flex h-10 flex-row items-center gap-2',
        className?.container,
      )}
      role="navigation"
    >
      {onPreviousPost && (
        <SimpleTooltip content="Previous">
          <Button
            className="-rotate-90"
            icon={<ArrowIcon />}
            variant={ButtonVariant.Tertiary}
            onClick={onPreviousPost}
            disabled={[PostPosition.First, PostPosition.Only].includes(
              postPosition,
            )}
          />
        </SimpleTooltip>
      )}
      {onNextPost && (
        <SimpleTooltip content="Next">
          <Button
            className="rotate-90"
            icon={<ArrowIcon />}
            variant={ButtonVariant.Tertiary}
            onClick={onNextPost}
            disabled={[PostPosition.Last, PostPosition.Only].includes(
              postPosition,
            )}
          />
        </SimpleTooltip>
      )}
      <PostHeaderActions
        {...props}
        className={classNames('flex', className?.actions)}
        notificationClassName="ml-4"
        contextMenuId={contextMenuId}
      />
    </div>
  );
}

export default PostNavigation;
