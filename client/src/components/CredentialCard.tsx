import type { Player } from '../../../shared/protocol';
import {
  credentialFields,
  credentialLabels,
  credentialOptions,
} from '../../../shared/investigation';

export function CredentialCard({
  player,
  compatible,
}: {
  player: Player;
  compatible?: boolean;
}) {
  if (!player.credential) return null;
  return (
    <article
      className={`credential-card ${compatible === false ? 'ruled-out' : ''}`}
    >
      <h3>
        <span aria-hidden="true">{player.avatar}</span> {player.name}
      </h3>
      <dl>
        {credentialFields.map((field) => (
          <div key={field}>
            <dt>{credentialLabels[field]}</dt>
            <dd>
              <span aria-hidden="true">
                {
                  credentialOptions[field].find(
                    (option) => option.value === player.credential![field],
                  )?.icon
                }
              </span>{' '}
              {player.credential![field]}
            </dd>
          </div>
        ))}
      </dl>
      {compatible !== undefined && (
        <p className="candidate-status">
          {compatible
            ? '◎ Compatible con las pistas'
            : '✓ No coincide con todas las pistas'}
        </p>
      )}
    </article>
  );
}
