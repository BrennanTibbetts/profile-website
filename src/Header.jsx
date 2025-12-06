import { bioText } from './data';

export default function Header() {
  return (
    <div className="left-top">
      <h1 className="title">Brennan Tibbetts</h1>
      <p className="subtitle">3D web developer · Interactive experiences</p>
      <p className="bio">{bioText}</p>
      <hr className="divider" />
    </div>
  );
}
