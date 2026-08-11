import React, { useContext, useState } from 'react';
import Container from '../components/layout/Container';
import HeadingWithLogo from '../components/typography/HeadingWithLogo';
import Button from '../components/buttons/Button';
import { Input } from '../components/forms/Input';
import { Form } from '../components/forms/Form';
import { FormGroup } from '../components/forms/FormGroup';
import { Label } from '../components/forms/Label';
import Text from '../components/typography/Text';
import RelativeWrapper from '../components/layout/RelativeWrapper';
import { TiledBackgroundImage } from '../components/decoration/TiledBackgroundImage';
import useScrollToTopOnPageLoad from '../hooks/useScrollToTopOnPageLoad';
import roomContext from '../context/room/roomContext';

const Play = () => {
  const { createRoom, joinRoom, error, clearError } = useContext(roomContext);

  useScrollToTopOnPageLoad();

  const [maxPlayers, setMaxPlayers] = useState(4);
  const [targetScore, setTargetScore] = useState(500);
  const [joinCode, setJoinCode] = useState('');

  return (
    <RelativeWrapper>
      <TiledBackgroundImage />
      <Container
        fullHeight
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        padding="6rem 2rem 2rem 2rem"
        contentCenteredMobile
      >
        <Form
          onSubmit={(e) => {
            e.preventDefault();
            clearError();
            createRoom(Number(maxPlayers), Number(targetScore));
          }}
        >
          <HeadingWithLogo textCentered hideIconOnMobile={false}>
            Buat Room Ceki
          </HeadingWithLogo>
          <FormGroup>
            <Label htmlFor="maxPlayers">Jumlah pemain</Label>
            <Input
              as="select"
              id="maxPlayers"
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(e.target.value)}
            >
              <option value={2}>2 pemain</option>
              <option value={3}>3 pemain</option>
              <option value={4}>4 pemain</option>
            </Input>
          </FormGroup>
          <FormGroup>
            <Label htmlFor="targetScore">Target skor</Label>
            <Input
              as="select"
              id="targetScore"
              value={targetScore}
              onChange={(e) => setTargetScore(e.target.value)}
            >
              <option value={500}>500</option>
              <option value={1000}>1000</option>
            </Input>
          </FormGroup>
          <Button primary type="submit" fullWidth>
            Buat Room
          </Button>
        </Form>

        <Form
          style={{ marginTop: '2rem' }}
          onSubmit={(e) => {
            e.preventDefault();
            clearError();
            joinRoom(joinCode.trim().toUpperCase());
          }}
        >
          <HeadingWithLogo textCentered hideIconOnMobile={false}>
            Gabung Room
          </HeadingWithLogo>
          <FormGroup>
            <Label htmlFor="joinCode">Kode Room</Label>
            <Input
              type="text"
              id="joinCode"
              autoComplete="off"
              maxLength={6}
              placeholder="mis. AB2CD9"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              required
            />
          </FormGroup>
          {error && (
            <Text textAlign="center" style={{ color: 'red' }}>
              {error}
            </Text>
          )}
          <Button secondary type="submit" fullWidth>
            Gabung
          </Button>
        </Form>
      </Container>
    </RelativeWrapper>
  );
};

export default Play;
