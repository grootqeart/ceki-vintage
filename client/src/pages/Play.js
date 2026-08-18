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
import OpenRoomList from '../components/game/OpenRoomList';
import { ROOM_NAME_MAX_LENGTH } from '../pokergame/ceki/constants';

const Play = () => {
  const { createRoom, joinRoom, error, clearError } = useContext(roomContext);

  useScrollToTopOnPageLoad();

  const [roomName, setRoomName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [targetScore, setTargetScore] = useState(500);
  const [search, setSearch] = useState('');

  const join = (code) => {
    clearError();
    joinRoom(String(code).trim().toUpperCase());
  };

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
            createRoom(Number(maxPlayers), Number(targetScore), roomName);
          }}
        >
          <HeadingWithLogo textCentered hideIconOnMobile={false}>
            Buat Room Ceki
          </HeadingWithLogo>
          <FormGroup>
            <Label htmlFor="roomName">Nama room</Label>
            <Input
              type="text"
              id="roomName"
              autoComplete="off"
              maxLength={ROOM_NAME_MAX_LENGTH}
              placeholder="mis. Ceki santai malam"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
            />
          </FormGroup>
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

        <Form style={{ marginTop: '2rem' }} onSubmit={(e) => e.preventDefault()}>
          <HeadingWithLogo textCentered hideIconOnMobile={false}>
            Cari Room
          </HeadingWithLogo>
          <FormGroup>
            <Label htmlFor="search">Nama room atau kode</Label>
            <Input
              type="text"
              id="search"
              autoComplete="off"
              placeholder="ketik nama, kode, atau nama host"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </FormGroup>

          {/* A code typed in full is almost always meant as "take me there",
              so offer that directly instead of making the player hunt for the
              row -- the room may not even be listed, since only rooms still
              waiting for players appear. */}
          {search.trim().length === 6 && (
            <Button secondary fullWidth type="button" onClick={() => join(search)}>
              Gabung ke kode {search.trim().toUpperCase()}
            </Button>
          )}

          <OpenRoomList query={search} onJoin={join} />

          {error && (
            <Text textAlign="center" style={{ color: 'red', marginTop: '0.75rem' }}>
              {error}
            </Text>
          )}
        </Form>
      </Container>
    </RelativeWrapper>
  );
};

export default Play;
