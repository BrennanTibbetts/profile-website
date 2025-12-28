import { projects } from './projects';
import { renderParagraphsAsNodes } from './utils/renderText';

export default function ViewInfo({ viewIndex, showTitle = true }) {
  const project = projects[viewIndex] || {};

  return (
    <div className="view-info">
      {showTitle && project.title && (
        <h3 className="project-title">{project.title}</h3>
      )}
      {renderParagraphsAsNodes(project.description, '', viewIndex)}
    </div>
  );
}
