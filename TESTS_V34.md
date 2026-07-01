# Tests V34

## Vérifications effectuées dans l'environnement local

- `npm run check` : OK
- `npm run typecheck` : OK
- `npm run build` : OK

## Points à tester dans l'application Windows

1. Importer au moins deux fichiers audio.
2. Placer les clips sur des pistes différentes.
3. Régler une position timeline différente pour chaque clip.
4. Cliquer Play : les clips doivent démarrer en fonction de leur position timeline.
5. Activer Mute / Solo / Volume sur les pistes : la lecture projet doit respecter le mixer.
6. Cliquer dans la timeline : le curseur projet doit se déplacer.
7. Activer LOOP avec un clip sélectionné : la boucle doit revenir au point A projet.
8. Exporter le mix WAV : les positions timeline doivent être conservées.
