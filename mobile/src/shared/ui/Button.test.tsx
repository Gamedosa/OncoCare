import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { Button } from './Button';

describe('Button', () => {
  it('calls onPress when enabled', async () => {
    const onPress = jest.fn();
    await render(<Button onPress={onPress}>Salvar</Button>);

    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('exposes disabled state and ignores presses', async () => {
    const onPress = jest.fn();
    await render(
      <Button onPress={onPress} disabled>
        Salvar
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Salvar' });
    await fireEvent.press(button);

    expect(onPress).not.toHaveBeenCalled();
    expect(button.props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('is busy and disabled while loading', async () => {
    await render(<Button loading>Salvar</Button>);

    expect(screen.getByRole('button').props.accessibilityState).toMatchObject({ disabled: true, busy: true });
  });
});
