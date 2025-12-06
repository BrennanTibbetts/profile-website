import { projects } from './projects';

export default function ViewInfo({ viewIndex }) {
  const project = projects[viewIndex];

  return (
    <div className="view-info">
      <p>{project.description}</p>
    </div>
  );
}
